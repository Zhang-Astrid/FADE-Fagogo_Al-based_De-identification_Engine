from .utils.detector import Detector
import img2pdf
from pdf2image import convert_from_path
from .utils.img import mosaic, blur, black, empty
import numpy as np
import cv2
import os

# todo: Use GUI to modify those hyperparameters
MOSAIC_SIZE = 10
BLUR_KERNEL = (51, 51)
COVER_METHODS = {"blur": blur, "mosaic":mosaic, "black":black, "empty":empty}

def process(root_path, config, config_hash):
    # 从配置中提取处理选项
    compute_mode = config.get('compute_mode', 'cpu')
    model_type = config.get('model_type', 'ner')
    
    # Initialize the detector with specified options
    detector = Detector(gpu=(compute_mode=='gpu'), model_type=model_type)
    pdf_file = 'origin.pdf'
    pdf_path = os.path.join(root_path, pdf_file)
    print(f"[INFO] Processing {pdf_path} with compute_mode={compute_mode}, model_type={model_type}")
    
    # 存储处理结果
    processing_results = {}
    total_pages = 0
    processed_pages = 0

    detector.ocr_path = os.path.join(root_path, 'ocr_result.json')
    sens_info_locs = detector.get_sens_info_loc(pdf_path)

    # Convert PDF pages to numpy type images
    imgs = convert_from_path(pdf_path, dpi=300, fmt="png", thread_count=10, use_pdftocairo=True)
    imgs_bin = [cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR) for image in imgs]
    total_pages = len(imgs_bin)
    for k, v in sens_info_locs.items():
        for page_index, x, y, w, h in v:
            # Apply the appropriate covering method based on the type
            zoom =3
            x, y, w, h = int(x * zoom), int(y * zoom), int(w * zoom), int(h * zoom)
            COVER_METHODS[config[k]](imgs_bin[page_index], x, y, w, h, MOSAIC_SIZE, BLUR_KERNEL)
    imgs = []
    # Save the processed images as a PDF
    for img in imgs_bin:
        _, buffer = cv2.imencode(".png", img)
        imgs.append(buffer.tobytes())
    processed_pdf_path = os.path.join(root_path, f'processed_{config_hash}.pdf')
    print(f"[INFO] Saving processed images to {processed_pdf_path}")
    with open(processed_pdf_path, "wb") as f:
        f.write(img2pdf.convert(imgs))

    return {
        'success': True,
        'processing_results': processing_results,
        'total_pages': total_pages,
        'processed_pages': processed_pages,
        'processed_pdf_path': processed_pdf_path,
        'compute_mode': compute_mode,
        'model_type': model_type
    }
