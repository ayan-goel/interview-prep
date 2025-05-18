import os
import logging
import tensorflow as tf
import tensorflow_hub as hub
import numpy as np
import cv2
from collections import deque
import tempfile
import subprocess

logger = logging.getLogger(__name__)

class BodyLanguageAnalysisService:
    """Service for analyzing body language in interview videos using TensorFlow models"""
    
    def __init__(self):
        # Initialize TensorFlow configuration
        gpus = tf.config.experimental.list_physical_devices('GPU')
        if gpus:
            try:
                # Use only the first GPU and limit memory growth
                tf.config.experimental.set_visible_devices(gpus[0], 'GPU')
                tf.config.experimental.set_memory_growth(gpus[0], True)
                logger.info("Using GPU for body language analysis")
            except RuntimeError as e:
                logger.error(f"Error configuring GPU: {str(e)}")
        
        # Enable aggressive tensor conversion checking
        tf.debugging.enable_check_numerics()
        
        # Load models
        self._load_models()
        logger.info("Body language analysis service initialized")
    
    def _load_models(self):
        """Load TensorFlow models for body language analysis"""
        try:
            # Load MoveNet model for pose detection
            self.pose_model = hub.load('https://tfhub.dev/google/movenet/singlepose/lightning/4')
            self.movenet = self.pose_model.signatures['serving_default']
            
            # Get the input shape expected by the model
            self.movenet_input_name = list(self.movenet.structured_input_signature[1].keys())[0]
            
            # Determine the exact input requirements (shape and dtype)
            input_specs = self.movenet.structured_input_signature[1][self.movenet_input_name]
            self.movenet_dtype = input_specs.dtype
            self.movenet_shape = input_specs.shape
            
            logger.info(f"MoveNet model loaded with input name: {self.movenet_input_name}")
            logger.info(f"MoveNet expected input shape: {self.movenet_shape}, dtype: {self.movenet_dtype}")
            
            # Create a preprocessing function based on model requirements
            if self.movenet_dtype == tf.int32:
                self.preprocess_for_movenet = lambda img: tf.cast(img, tf.int32)
            else:
                self.preprocess_for_movenet = lambda img: tf.cast(img, tf.float32)
            
            # Load face detection model
            face_model_path = os.path.join(os.path.dirname(__file__), '../models/face_detection_short_range.tflite')
            if os.path.exists(face_model_path):
                self.face_detector = tf.lite.Interpreter(model_path=face_model_path)
                self.face_detector.allocate_tensors()
                # Get input details to determine expected shape
                input_details = self.face_detector.get_input_details()
                self.face_input_shape = input_details[0]['shape'][1:3]  # Get height and width
                self.face_input_dtype = input_details[0]['dtype']
                logger.info(f"Face detector model loaded with input shape: {self.face_input_shape}, dtype: {self.face_input_dtype}")
            else:
                logger.warning("Face detection model not found, eye contact analysis will be limited")
                self.face_detector = None
                self.face_input_shape = (128, 128)  # Default shape
                self.face_input_dtype = np.uint8  # Default dtype
                
            logger.info("All models loaded successfully")
        except Exception as e:
            logger.exception(f"Error loading models: {str(e)}")
            # Set models to None so we can check later and use fallback methods
            self.pose_model = None
            self.face_detector = None
    
    def analyze(self, video_path):
        """
        Analyze body language in a video
        
        Args:
            video_path: Path to the video file
            
        Returns:
            Dictionary with body language analysis results
        """
        try:
            # Verify video exists
            if not os.path.exists(video_path):
                logger.error(f"Video file not found: {video_path}")
                return self._generate_default_response()
            
            # Extract frames for analysis
            frames = self._extract_frames(video_path)
            if not frames:
                logger.error("Failed to extract frames from video")
                return self._generate_default_response()
            
            # Analyze posture
            posture_results = self._analyze_posture(frames)
            
            # Analyze face/eye contact
            eye_contact_results = self._analyze_eye_contact(frames)
            
            # Analyze fidgeting and movement
            movement_results = self._analyze_movement(frames)
            
            # Combine results
            results = {
                "posture": posture_results,
                "eye_contact": eye_contact_results,
                "movement": movement_results,
                "confidence_score": self._calculate_confidence_score(
                    posture_results, eye_contact_results, movement_results
                )
            }
            
            logger.info("Body language analysis completed successfully")
            return results
            
        except Exception as e:
            logger.exception(f"Error in body language analysis: {str(e)}")
            return self._generate_default_response()
    
    def _extract_frames(self, video_path, max_frames=30):
        """Extract frames from video for analysis"""
        try:
            logger.info(f"Extracting frames from {video_path}")
            
            # Open the video file
            cap = cv2.VideoCapture(video_path)
            
            if not cap.isOpened():
                logger.error(f"Could not open video file: {video_path}")
                return []
            
            # Get video properties
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            # Safety check for corrupted videos or negative frame counts
            if frame_count <= 0:
                logger.warning(f"Invalid frame count detected: {frame_count}. Using manual extraction.")
                # Fallback to manual frame extraction
                frames = []
                frame_idx = 0
                while frame_idx < 100:  # Safety limit
                    ret, frame = cap.read()
                    if not ret:
                        break
                    
                    if frame_idx % 3 == 0 and len(frames) < max_frames:  # Sample every 3rd frame
                        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                        frames.append(frame_rgb)
                    
                    frame_idx += 1
                
                cap.release()
                logger.info(f"Manually extracted {len(frames)} frames from video")
                return frames
            
            # If video is too short, use fewer frames
            if frame_count < max_frames:
                max_frames = frame_count
            
            # Calculate which frames to extract
            frames_to_extract = np.linspace(0, frame_count-1, max_frames, dtype=int)
            
            # Extract frames
            frames = []
            for frame_index in frames_to_extract:
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
                ret, frame = cap.read()
                if ret:
                    # Convert to RGB for TensorFlow models
                    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    frames.append(frame_rgb)
            
            cap.release()
            
            logger.info(f"Extracted {len(frames)} frames from video")
            return frames
            
        except Exception as e:
            logger.exception(f"Error extracting frames: {str(e)}")
            return []
    
    def _analyze_posture(self, frames):
        """Analyze posture using pose estimation"""
        if not frames or self.pose_model is None:
            return {"score": 70, "evaluation": "Unable to analyze posture"}
        
        try:
            posture_scores = []
            
            for frame in frames:
                try:
                    # Verify frame exists and has correct dimensions
                    if frame is None or len(frame.shape) < 3:
                        logger.warning("Invalid frame format")
                        continue

                    # First convert to TensorFlow tensor
                    tensor_img = tf.convert_to_tensor(frame)
                    
                    # Resize frame to expected dimensions
                    resized_img = tf.image.resize_with_pad(
                        tf.expand_dims(tensor_img, axis=0), 
                        192, 192
                    )
                    
                    # Apply proper preprocessing based on model's expected dtype
                    processed_img = self.preprocess_for_movenet(resized_img)
                    
                    # Log details for debugging
                    logger.debug(f"Input tensor: shape={processed_img.shape}, dtype={processed_img.dtype}")
                    
                    # Create the input dict expected by the model
                    input_dict = {self.movenet_input_name: processed_img}
                    
                    # Run inference
                    try:
                        result = self.movenet(**input_dict)
                        keypoints = result['output_0'].numpy()[0, 0, :, :2]
                        
                        # Calculate posture metrics
                        # Check shoulder alignment (horizontal)
                        left_shoulder = keypoints[5]
                        right_shoulder = keypoints[6]
                        shoulder_alignment = abs(left_shoulder[1] - right_shoulder[1])
                        
                        # Check back straightness (by comparing nose, mid-shoulder and mid-hip)
                        nose = keypoints[0]
                        mid_shoulder = (keypoints[5] + keypoints[6]) / 2
                        mid_hip = (keypoints[11] + keypoints[12]) / 2
                        
                        # Compute vectors
                        upper_body_vector = mid_shoulder - nose
                        lower_body_vector = mid_hip - mid_shoulder
                        
                        # Calculate alignment angle
                        if np.linalg.norm(upper_body_vector) > 0 and np.linalg.norm(lower_body_vector) > 0:
                            alignment = np.dot(upper_body_vector, lower_body_vector) / (
                                np.linalg.norm(upper_body_vector) * np.linalg.norm(lower_body_vector)
                            )
                            alignment_angle = np.arccos(np.clip(alignment, -1.0, 1.0))
                            
                            # Score based on how close to straight the back is
                            # (lower angle is better, we want the vectors to be aligned)
                            posture_score = 100 - (alignment_angle * 180 / np.pi)
                            
                            # Adjust based on shoulder alignment
                            if shoulder_alignment > 0.05:  # Threshold for uneven shoulders
                                posture_score -= 10 * shoulder_alignment
                                
                            posture_scores.append(max(0, min(100, posture_score)))
                    except Exception as inference_error:
                        logger.error(f"Model inference error: {str(inference_error)}")
                        continue
                        
                except Exception as frame_error:
                    logger.warning(f"Error analyzing frame: {str(frame_error)}")
                    continue
            
            # Calculate final score
            if posture_scores:
                final_score = int(np.mean(posture_scores))
                
                # Generate evaluation
                if final_score >= 85:
                    evaluation = "Excellent posture. You maintained a straight back and well-aligned shoulders."
                elif final_score >= 70:
                    evaluation = "Good posture overall. Minor inconsistencies in back straightness."
                elif final_score >= 50:
                    evaluation = "Fair posture. Consider sitting/standing straighter with shoulders back."
                else:
                    evaluation = "Posture needs improvement. Try to keep your back straight and shoulders aligned."
                
                return {
                    "score": final_score,
                    "evaluation": evaluation
                }
            else:
                return {"score": 70, "evaluation": "Posture analysis inconclusive"}
                
        except Exception as e:
            logger.exception(f"Error analyzing posture: {str(e)}")
            return {"score": 70, "evaluation": "Error in posture analysis"}
    
    def _analyze_eye_contact(self, frames):
        """Analyze eye contact using face detection"""
        if not frames:
            return {"score": 70, "evaluation": "Unable to analyze eye contact"}
        
        try:
            face_detections = []
            frame_height, frame_width = frames[0].shape[:2]
            center_x, center_y = frame_width // 2, frame_height // 2
            
            for frame in frames:
                try:
                    # If we have a face detector, use it
                    if self.face_detector:
                        # Resize for face detection using the expected input shape from model
                        input_frame = cv2.resize(frame, self.face_input_shape)
                        
                        input_details = self.face_detector.get_input_details()
                        output_details = self.face_detector.get_output_details()
                        
                        # Ensure we have the right tensor type
                        input_dtype = input_details[0]['dtype']
                        
                        if input_dtype == np.float32:
                            # Normalize input to [0,1] range if float is expected
                            input_tensor = np.expand_dims(
                                input_frame.astype(np.float32) / 255.0, 0
                            )
                        else:
                            # Use uint8 [0,255] range otherwise
                            input_tensor = np.expand_dims(
                                input_frame.astype(np.uint8), 0
                            )
                        
                        # Log tensor details for debugging
                        logger.debug(f"Face detection input: shape={input_tensor.shape}, dtype={input_tensor.dtype}")
                        
                        # Set tensor and run inference
                        self.face_detector.set_tensor(input_details[0]['index'], input_tensor)
                        self.face_detector.invoke()
                        
                        # Get detection results with safer access
                        if len(output_details) >= 3:  # Make sure we have enough outputs
                            # The exact output format can vary by model - handle carefully
                            boxes = self.face_detector.get_tensor(output_details[0]['index'])
                            scores = self.face_detector.get_tensor(output_details[2]['index'])
                            
                            # Log output shapes for debugging
                            logger.debug(f"Detection boxes shape: {boxes.shape}, scores shape: {scores.shape}")
                            
                            # Check if we have any results
                            if boxes.size > 0 and scores.size > 0:
                                # Handle different output formats
                                # Some models output [1, num_detections, 4] others [num_detections, 4]
                                if len(boxes.shape) == 3:
                                    # Format is [batch, detection, coordinates]
                                    boxes = boxes[0]  # Remove batch dimension
                                    scores = scores[0]  # Remove batch dimension
                                
                                # Process first detection if score is high enough
                                if len(scores) > 0 and scores[0] >= 0.5:
                                    ymin, xmin, ymax, xmax = boxes[0]
                                    face_center_x = (xmin + xmax) / 2 * frame_width
                                    face_center_y = (ymin + ymax) / 2 * frame_height
                                    
                                    # Calculate distance from center
                                    distance_from_center = np.sqrt(
                                        (face_center_x - center_x)**2 + (face_center_y - center_y)**2
                                    )
                                    
                                    # Normalize by frame diagonal
                                    diagonal = np.sqrt(frame_width**2 + frame_height**2)
                                    normalized_distance = distance_from_center / diagonal
                                    
                                    # Score based on how centered the face is
                                    eye_contact_score = 100 - (normalized_distance * 200)  # Lower distance = higher score
                                    face_detections.append(max(0, min(100, eye_contact_score)))
                                else:
                                    # No face detected with high confidence
                                    face_detections.append(0)
                            else:
                                # No detection results
                                face_detections.append(0)
                        else:
                            # Not enough outputs from the model
                            face_detections.append(0)
                    else:
                        # Simple fallback: detect face by color
                        # Convert to HSV for skin detection
                        hsv_frame = cv2.cvtColor(frame, cv2.COLOR_RGB2HSV)
                        
                        # Define skin color range
                        lower_skin = np.array([0, 20, 70], dtype=np.uint8)
                        upper_skin = np.array([20, 255, 255], dtype=np.uint8)
                        
                        # Create binary mask for skin
                        skin_mask = cv2.inRange(hsv_frame, lower_skin, upper_skin)
                        
                        # Find contours
                        contours, _ = cv2.findContours(skin_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                        
                        # If large enough contour in center region, likely a face
                        face_detected = False
                        for contour in contours:
                            if cv2.contourArea(contour) > (frame_width * frame_height * 0.05):
                                face_detected = True
                                break
                        
                        if face_detected:
                            face_detections.append(80)  # Approximation
                        else:
                            face_detections.append(0)
                except Exception as frame_error:
                    logger.warning(f"Error analyzing face in frame: {str(frame_error)}")
                    continue
            
            # Calculate final score
            if face_detections:
                # Calculate percentage of frames with good eye contact
                good_eye_contact_frames = sum(1 for score in face_detections if score >= 70)
                eye_contact_percentage = good_eye_contact_frames / len(face_detections) * 100
                
                # Generate evaluation
                if eye_contact_percentage >= 90:
                    evaluation = "Excellent eye contact. You consistently maintained focus on the camera."
                elif eye_contact_percentage >= 75:
                    evaluation = "Good eye contact. You maintained focus on the camera most of the time."
                elif eye_contact_percentage >= 50:
                    evaluation = "Fair eye contact. Try to look at the camera more consistently."
                else:
                    evaluation = "Limited eye contact. Focus more on the camera to increase engagement."
                
                return {
                    "score": int(eye_contact_percentage),
                    "evaluation": evaluation,
                    "details": f"Maintained eye contact in {good_eye_contact_frames} of {len(face_detections)} analyzed frames."
                }
            else:
                return {"score": 70, "evaluation": "Eye contact analysis inconclusive"}
                
        except Exception as e:
            logger.exception(f"Error analyzing eye contact: {str(e)}")
            return {"score": 70, "evaluation": "Error in eye contact analysis"}
    
    def _analyze_movement(self, frames):
        """Analyze fidgeting and excessive movement"""
        if not frames or len(frames) < 3:
            return {"score": 70, "evaluation": "Unable to analyze movement"}
        
        try:
            # Track movement between frames
            frame_diffs = []
            prev_gray = cv2.cvtColor(frames[0], cv2.COLOR_RGB2GRAY)
            
            for i in range(1, len(frames)):
                curr_gray = cv2.cvtColor(frames[i], cv2.COLOR_RGB2GRAY)
                
                # Calculate optical flow
                flow = cv2.calcOpticalFlowFarneback(
                    prev_gray, curr_gray, None, 0.5, 3, 15, 3, 5, 1.2, 0
                )
                
                # Calculate magnitude of flow
                magnitude, _ = cv2.cartToPolar(flow[..., 0], flow[..., 1])
                avg_magnitude = np.mean(magnitude)
                
                # Add to differences
                frame_diffs.append(avg_magnitude)
                
                # Update previous frame
                prev_gray = curr_gray
            
            # Analyze movement patterns
            if frame_diffs:
                # Calculate metrics
                avg_movement = np.mean(frame_diffs)
                movement_variance = np.var(frame_diffs)
                
                # Classify movement
                if avg_movement < 1.0:
                    movement_type = "minimal"
                    movement_score = 90
                    evaluation = "Composed presentation with minimal unnecessary movement."
                elif avg_movement < 3.0:
                    movement_type = "moderate"
                    movement_score = 80
                    evaluation = "Good balance of natural movement without excessive fidgeting."
                elif avg_movement < 6.0:
                    movement_type = "noticeable"
                    movement_score = 60
                    evaluation = "Some fidgeting detected. Try to reduce unnecessary movements."
                else:
                    movement_type = "excessive"
                    movement_score = 40
                    evaluation = "Excessive movement detected. Focus on staying more composed."
                
                # Adjust score based on variance (consistent vs. erratic)
                if movement_variance > 5.0 and movement_type not in ["minimal", "moderate"]:
                    movement_score -= 10
                    evaluation += " Movement appears erratic rather than steady."
                
                return {
                    "score": movement_score,
                    "evaluation": evaluation,
                    "details": {
                        "movement_level": movement_type,
                        "avg_magnitude": float(avg_movement),
                        "variance": float(movement_variance)
                    }
                }
            else:
                return {"score": 70, "evaluation": "Movement analysis inconclusive"}
                
        except Exception as e:
            logger.exception(f"Error analyzing movement: {str(e)}")
            return {"score": 70, "evaluation": "Error in movement analysis"}
    
    def _calculate_confidence_score(self, posture_results, eye_contact_results, movement_results):
        """Calculate overall confidence score based on body language metrics"""
        try:
            # Extract individual scores
            posture_score = posture_results.get("score", 70)
            eye_contact_score = eye_contact_results.get("score", 70)
            movement_score = movement_results.get("score", 70)
            
            # Weight the scores
            # Eye contact is most important, then posture, then movement
            weighted_score = (
                eye_contact_score * 0.4 +
                posture_score * 0.35 +
                movement_score * 0.25
            )
            
            # Round to nearest integer
            return int(round(weighted_score))
            
        except Exception as e:
            logger.exception(f"Error calculating confidence score: {str(e)}")
            return 70
    
    def _generate_default_response(self):
        """Generate a default response if analysis fails"""
        return {
            "posture": {
                "score": 70,
                "evaluation": "Posture appears adequate. Consider maintaining a straight back."
            },
            "eye_contact": {
                "score": 70,
                "evaluation": "Eye contact seems satisfactory. Try to maintain consistent focus on the camera."
            },
            "movement": {
                "score": 70,
                "evaluation": "Movement level appears normal. Maintain a balanced level of natural gestures."
            },
            "confidence_score": 70
        } 