"""
Sentinel AI Engine - YOLOv8n Object Detection (2026 Edition)
Single shared detector instance for all cameras - ultra efficient
"""
import cv2
import numpy as np
import logging
from typing import List, Dict, Tuple, Optional
import threading
import time
from datetime import datetime
import torch
import warnings

# PyTorch 2.6+ compatibility: Monkey patch torch.load ANTES de importar ultralytics
_original_torch_load = torch.load
def _patched_torch_load(*args, **kwargs):
    """Force weights_only=False for ultralytics compatibility"""
    kwargs.setdefault('weights_only', False)
    return _original_torch_load(*args, **kwargs)
torch.load = _patched_torch_load

warnings.filterwarnings('ignore', category=FutureWarning)
warnings.filterwarnings('ignore', category=UserWarning)

from ultralytics import YOLO

from ..core.config import settings

logger = logging.getLogger(__name__)


class YOLOv8DetectorSingleton:
    """
    Singleton YOLOv8n detector for ultra-efficient resource usage
    6MB model, 60% faster than YOLOv3-tiny, 13% more accurate
    One model instance shared across all cameras
    """
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if not cls._instance:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if getattr(self, '_initialized', False):
            return
            
        self.model_loaded = False
        self.model = None
        self.detection_lock = threading.Lock()  # Thread-safe detection
        
        # Load YOLOv8n model once
        self._load_model()
        self._initialized = True
        
    def _load_model(self):
        """Load YOLOv8n model - executed only once, ultra efficient"""
        try:
            logger.info("Loading YOLOv8n model (6MB, state-of-the-art 2023)...")
            
            # Force CPU for stability with multiple cameras
            torch.set_num_threads(1)  # Prevent thread conflicts
            
            # Load YOLOv8n model (6MB, auto-downloads if needed)
            # torch.load already patched at module level for PyTorch 2.6+ compatibility
            self.model = YOLO('yolov8n.pt')
            
            # Configure for CPU inference
            self.model.to('cpu')
            
            # Warm up model with dummy inference
            dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)
            _ = self.model(dummy_frame, classes=[0], conf=0.5, verbose=False)
            
            self.model_loaded = True
            logger.info("✅ YOLOv8n model loaded successfully (shared singleton, 6MB)")
            
        except Exception as e:
            logger.error(f"❌ Failed to load YOLOv8n model: {e}")
            import traceback
            traceback.print_exc()
            self.model_loaded = False
    
    def detect_people_only(self, frame: np.ndarray, confidence_threshold: float = 0.5) -> int:
        """
        Ultra-optimized YOLOv8n people detection with thread safety
        60% faster than YOLOv3-tiny, 13% more accurate
        Returns count of people detected
        """
        if not self.model_loaded:
            return 0
        
        try:
            # Thread-safe detection with lock
            with self.detection_lock:
                # YOLOv8n inference (much faster than YOLOv3)
                results = self.model(
                    frame,
                    classes=[0],  # Only person class
                    conf=confidence_threshold,
                    verbose=False,
                    stream=False
                )
            
            # Count detected people
            people_count = 0
            if results and len(results) > 0 and results[0].boxes is not None:
                people_count = len(results[0].boxes)
            
            return people_count
            
        except Exception as e:
            logger.error(f"Error in YOLOv8n people detection: {e}")
            return 0
    
    def get_status(self) -> Dict:
        """Get detector status"""
        return {
            "model_loaded": self.model_loaded,
            "model_size": "6MB",
            "backend": "PyTorch CPU",
            "model_type": "YOLOv8n (2023)",
            "performance": "60% faster, 13% more accurate than YOLOv3-tiny"
        }


# Global singleton instance
_yolo_detector = None

def get_yolo_detector() -> YOLOv8DetectorSingleton:
    """Get the global YOLOv8n detector instance (singleton pattern)"""
    global _yolo_detector
    if _yolo_detector is None:
        _yolo_detector = YOLOv8DetectorSingleton()
    return _yolo_detector


class ProcessingEngine:
    """
    AI Processing Engine for camera streams
    Uses shared YOLOv8n detector for maximum efficiency
    """
    
    def __init__(self, camera_id: int):
        self.camera_id = camera_id
        self.detector = get_yolo_detector()  # Shared YOLOv8n instance
        self.last_processing_time = 0
        self.min_processing_interval = 0.5  # 500ms interval (YOLOv8n is faster)
        self.total_detections = 0
        
    def detect_people(self, frame: np.ndarray, confidence_threshold: float = 0.5) -> int:
        """
        Detect people in frame with rate limiting
        
        Args:
            frame: Input image frame (BGR)
            confidence_threshold: Minimum confidence for detection
            
        Returns:
            Number of people detected (0 if skipped due to rate limiting)
        """
        current_time = time.time()
        
        # Rate limiting to prevent overload
        if current_time - self.last_processing_time < self.min_processing_interval:
            return 0  # Skip processing
        
        self.last_processing_time = current_time
        
        # Use shared detector for people detection
        people_count = self.detector.detect_people_only(frame, confidence_threshold)
        
        if people_count > 0:
            self.total_detections += people_count
            logger.debug(f"Camera {self.camera_id}: Detected {people_count} people")
        
        return people_count
    
    def get_stats(self) -> Dict:
        """Get processing statistics"""
        return {
            "camera_id": self.camera_id,
            "detector_loaded": self.detector.model_loaded,
            "last_processing": self.last_processing_time,
            "total_detections": self.total_detections,
            "processing_interval": self.min_processing_interval
        }
