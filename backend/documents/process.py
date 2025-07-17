from .detector import Detector
import img2pdf
from pdf2image import convert_from_path
from .img import mosaic, blur, black, empty
import numpy as np
import cv2
import os

# todo: Use GUI to modify those hyperparameters
MOSAIC_SIZE = 10
BLUR_KERNEL = (51, 51)
COVER_METHODS = {"blur": blur, "mosaic":mosaic, "black":black, "empty":empty}

def process(root_path, config, config_hash):
    # Initialize the detector
    detector = Detector()
    pdf_file = 'origin.pdf'
    pdf_path = os.path.join(root_path, pdf_file)
    print(f"Processing {pdf_path}")
        
    # Convert PDF pages to numpy type images
    imgs = convert_from_path(pdf_path, dpi=300, fmt="png")
    imgs_bin = [cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR) for image in imgs]
    for i, img in enumerate(imgs_bin):
        output_dir = os.path.join(root_path, f"ocr/page_{i + 1}/")
        detector.output_dir = output_dir 
        sens_info_locs = detector.get_sens_info_loc(img)
        count = 0
        for k, v in sens_info_locs.items():
            count += len(v)
            if k in config.keys():
                for x, y, w, h in v:
                    COVER_METHODS[config[k]](img, x, y, w, h, mosaic_size=MOSAIC_SIZE, blur_kernel=BLUR_KERNEL)          
        if count == 0:
            print(f"No sensitive information found on page {i + 1} of {pdf_file}.")
            continue
        print(f"Found sensitive information on page {i + 1} of {pdf_file}.")
    imgs = []
    for img in imgs_bin:
        _, buffer = cv2.imencode(".png", img)
        imgs.append(buffer.tobytes())
    os.makedirs(os.path.join(root_path, 'outputs', config_hash), exist_ok=True)
    with open(os.path.join(root_path, 'outputs', config_hash, 'result.pdf'), "wb") as f:
        f.write(img2pdf.convert(imgs))
    return True
