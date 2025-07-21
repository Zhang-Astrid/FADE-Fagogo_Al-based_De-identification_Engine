from rapidocr_paddle import RapidOCR
import json
import os
from pdf2image import convert_from_path
import cv2
import numpy as np
import time
# 
class ROCRProcessor:
    def __init__(self, gpu=True):
        self.engine = RapidOCR(det_use_cuda=gpu, cls_use_cuda=gpu, rec_use_cuda=gpu)

    def process_pdf(self, pdf_path, ocr_path):
        ''' Process a PDF file and save OCR results to a JSON file.'''
        start_time = time.time()
        all_boxes, all_txts = [], []
        # Convert PDF pages to numpy type images
        imgs = convert_from_path(pdf_path, dpi=150, fmt="png", thread_count=10, use_pdftocairo=True)
        imgs_bin = [cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR) for image in imgs]
        for i, img in enumerate(imgs_bin):
            result = self.engine(img, return_word_box=True)
            boxes, txts = [], []
            for line in result[0]:
                for box in line[3]:
                    boxes.append(box)
                for text in line[4]:
                    txts.append(text)
                txts.append('\n')
                boxes.append(box)
            boxes = [[i, p0[0], p0[1], p2[0], p2[1]] for p0, p1, p2, p3 in boxes]
            all_boxes.extend(boxes)
            all_txts.extend(txts)
        with open(ocr_path, 'w', encoding='utf-8') as f:
            json.dump({"boxes": all_boxes, "txts": all_txts}, f, ensure_ascii=False)
        end_time = time.time()
        print(f"[INFO] RapidOCR processing time: {end_time - start_time:.2f} seconds")
