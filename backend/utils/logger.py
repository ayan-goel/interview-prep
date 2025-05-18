import logging
import os
import sys
from logging.handlers import RotatingFileHandler

def setup_logger():
    """Configure logging for the application"""
    log_level = os.environ.get('LOG_LEVEL', 'INFO')
    log_dir = os.environ.get('LOG_DIR', 'logs')
    
    # Create logs directory if it doesn't exist
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    
    # Set up logging configuration
    log_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    
    # Root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level))
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(log_formatter)
    root_logger.addHandler(console_handler)
    
    # File handler (rotating log files)
    file_handler = RotatingFileHandler(
        os.path.join(log_dir, 'app.log'),
        maxBytes=1024 * 1024 * 5,  # 5 MB
        backupCount=10
    )
    file_handler.setFormatter(log_formatter)
    root_logger.addHandler(file_handler)

    # Set specific log levels for some noisy libraries
    logging.getLogger('werkzeug').setLevel(logging.WARNING)
    logging.getLogger('tensorflow').setLevel(logging.WARNING)
    logging.getLogger('transformers').setLevel(logging.WARNING)
    
    return root_logger 