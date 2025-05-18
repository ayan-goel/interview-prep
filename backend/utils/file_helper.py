import os
import logging
import uuid
import tempfile
from werkzeug.utils import secure_filename
from datetime import datetime

logger = logging.getLogger(__name__)

# Configure uploads
UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'uploads')
ALLOWED_EXTENSIONS = {'mp4', 'webm', 'ogg', 'mov', 'avi'}

# Create uploads directory if it doesn't exist
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    """Check if file has an allowed extension"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_upload(file_obj):
    """
    Save an uploaded file to the upload directory
    
    Args:
        file_obj: File object from request.files
        
    Returns:
        Filename of the saved file
    """
    try:
        if file_obj and allowed_file(file_obj.filename):
            # Create a unique filename
            original_filename = secure_filename(file_obj.filename)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            unique_id = str(uuid.uuid4())[:8]
            
            # Get file extension
            _, ext = os.path.splitext(original_filename)
            
            # Create new filename
            filename = f"{timestamp}_{unique_id}{ext}"
            
            # Save file
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            file_obj.save(file_path)
            
            logger.info(f"File saved to {file_path}")
            return filename
        else:
            if not file_obj:
                raise ValueError("No file provided")
            else:
                raise ValueError(f"File type not allowed: {file_obj.filename}")
    except Exception as e:
        logger.exception(f"Error saving file: {str(e)}")
        raise

def get_file_path(filename):
    """Get the full path to a file in the upload directory"""
    return os.path.join(UPLOAD_FOLDER, filename)

def create_temp_file(data, suffix=None):
    """Create a temporary file with the given data"""
    try:
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        temp_file.write(data)
        temp_file.close()
        return temp_file.name
    except Exception as e:
        logger.exception(f"Error creating temporary file: {str(e)}")
        raise

def cleanup_file(file_path):
    """Remove a file if it exists"""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.info(f"Removed file: {file_path}")
            return True
        return False
    except Exception as e:
        logger.exception(f"Error cleaning up file {file_path}: {str(e)}")
        return False 