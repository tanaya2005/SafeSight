import torch  # type: ignore
import torch.nn.functional as F  # type: ignore
import torchvision.transforms as transforms  # type: ignore
from PIL import Image  # type: ignore
import numpy as np  # type: ignore
import logging
import requests  # type: ignore
import os

try:
    import timm  # type: ignore
except ImportError:
    logging.warning("timm library is not installed. Please run: pip install timm")

def load_database_embeddings(frm, api_url="http://localhost:5000/api/workers/faces"):
    """
    Downloads worker faces from the backend (Cloudinary URLs), extracts their embeddings
    using the FaceRecognitionModule (frm), and returns a dictionary of embeddings.
    """
    face_db_path = "face_database"
    os.makedirs(face_db_path, exist_ok=True)
    database_embeddings = {}
    
    try:
        response = requests.get(api_url, timeout=5)
        if response.status_code == 200:
            workers = response.json()
            for worker in workers:
                worker_id = worker.get("workerId")
                name = worker.get("name")
                image_url = worker.get("faceImageUrl")
                
                if not worker_id or not name or not image_url:
                    continue
                
                try:
                    img_name = f"{worker_id}_{name.replace(' ', '_')}.jpg"
                    img_path = os.path.join(face_db_path, img_name)
                    
                    if not os.path.exists(img_path):
                        if image_url.startswith("http"):
                            img_data = requests.get(image_url, timeout=5).content
                            with open(img_path, 'wb') as handler:
                                handler.write(img_data)
                    
                    if os.path.exists(img_path):
                        # Use PIL to safely open it from cache
                        img = Image.open(img_path).convert('RGB')
                        # Extract the tensor embedding
                        emb = frm.get_embedding(img)
                        # Store in dictionary memory using Name instead of just ID
                        key_name = f"{name} ({worker_id})"
                        database_embeddings[key_name] = emb
                        
                except Exception as e:
                    logging.error(f"[FaceRecognition] Failed loading image for {name}: {e}")
            logging.info(f"Loaded {len(database_embeddings)} faces from Cloudinary into memory.")
        else:
            logging.error(f"[FaceRecognition] API returned status {response.status_code}")
    except Exception as e:
        logging.error(f"[FaceRecognition] Error fetching worker faces (Are you sure the server is running?): {e}")

    return database_embeddings

class FaceRecognitionModule:
    """
    A Face Recognition Module utilizing a pre-trained Vision Transformer (ViT)
    model strictly configured for face embeddings via CosFace.
    """
    def __init__(self, model_name='hf_hub:gaunernst/vit_small_patch8_gap_112.cosface_ms1mv3', device=None):
        self.device = device if device else ('cuda' if torch.cuda.is_available() else 'cpu')
        logging.info(f"Initialized FaceRecognitionModule on {self.device}")
        
        try:
            # We enforce num_classes=0 because we want the raw 512-dim feature embeddings, 
            # not classification logits
            self.model = timm.create_model(model_name, pretrained=True, num_classes=0)
            self.model = self.model.to(self.device)
            self.model.eval()  # Set strictly to evaluation mode
        except Exception as e:
            logging.error(f"Failed to load timm face model: {e}")
            self.model = None
            
        # Define the exact pre-processing transforms expected by the TIMM model.
        # This face model natively expects 112x112 inputs normalized to ImageNet std.
        self.transform = transforms.Compose([
            transforms.Resize((112, 112)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.3, 0.3, 0.3], std=[0.3, 0.3, 0.3]) # Face standardization
        ])

    @torch.no_grad()
    def get_embedding(self, face_image):
        """
        Takes a face crop (NumPy BGR/RGB array or PIL Image) and returns a 
        normalized 512-dimensional feature vector.
        """
        if self.model is None:
            raise RuntimeError("Model failed to initialize.")
            
        # Standardize input to PIL Image RGB
        if isinstance(face_image, np.ndarray):
            # If it's BGR from opencv, convert to RGB
            if face_image.shape[-1] == 3 and isinstance(face_image[0][0][0], np.uint8):
                try:
                    import cv2
                    face_image = cv2.cvtColor(face_image, cv2.COLOR_BGR2RGB)
                except Exception:
                    pass
            face_image = Image.fromarray(face_image)
        elif not isinstance(face_image, Image.Image):
            raise TypeError("face_image must be a PIL Image or NumPy array.")
            
        # Apply transformation and add batch dimension [B, C, H, W]
        input_tensor = self.transform(face_image).unsqueeze(0).to(self.device)
        
        # Extract features
        embedding = self.model(input_tensor)
        
        # Normalize strictly to unit length using L2 normalization
        # This is critical for Cosine Similarity thresholding
        normalized_embedding = F.normalize(embedding, p=2, dim=1)
        
        # Return as flattened numpy array (1D, 512 float32 elements)
        return normalized_embedding.cpu().numpy().flatten()

    def update_database(self, database_embeddings):
        """
        Pre-computes the database into a single tensor matrix for O(1) batched comparisons.
        Call this once after load_database_embeddings().
        """
        self.db_ids = list(database_embeddings.keys())
        if not self.db_ids:
            self.db_tensors = None
            return
            
        # Stack all 512-d arrays into a single PyTorch tensor of shape (N, 512)
        stacked_arrays = np.vstack(list(database_embeddings.values()))
        self.db_tensors = torch.tensor(stacked_arrays, device=self.device)

    def is_authorized(self, input_embedding, threshold=0.45):
        """
        Vectorized comparison against all known workers simultaneously.
        """
        if getattr(self, 'db_tensors', None) is None:
            return None, 0.0
            
        # Shape: (1, 512)
        input_tensor = torch.tensor(input_embedding, device=self.device).unsqueeze(0)
        
        # Calculate cosine similarity against the entire database matrix at once
        # similarities shape: (N,)
        similarities = F.cosine_similarity(input_tensor, self.db_tensors)
        
        # Find the highest score and its index
        max_sim, max_idx = torch.max(similarities, dim=0)
        highest_sim = max_sim.item()
        
        if highest_sim >= threshold:
            return self.db_ids[max_idx.item()], highest_sim
        return None, highest_sim
