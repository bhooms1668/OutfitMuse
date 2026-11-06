from PIL import Image
from sklearn.cluster import KMeans
import numpy as np

def extract_palette(image_path: str, n_colors: int = 5) -> list[str]:
    img = Image.open(image_path).convert("RGB")

# crop to the middle of the frame, where the outfit usually is
    w, h = img.size
    img = img.crop((int(w * 0.25), int(h * 0.3), int(w * 0.75), int(h * 0.95)))
    img = img.resize((100, 100))
    pixels = np.array(img).reshape(-1, 3)

    kmeans = KMeans(n_clusters=n_colors, n_init=10, random_state=42)
    labels = kmeans.fit_predict(pixels)

    # sort colors by how many pixels belong to each cluster (most common first)
    counts = np.bincount(labels)
    order = np.argsort(counts)[::-1]
    centers = kmeans.cluster_centers_.astype(int)

    return ["#{:02x}{:02x}{:02x}".format(*centers[i]) for i in order]

if __name__ == "__main__":
    print(extract_palette("test.jpeg"))