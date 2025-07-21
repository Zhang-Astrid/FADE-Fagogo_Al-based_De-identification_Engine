import requests
import json
import os
import time

class OCRProcessor:
    def __init__(self):
        self.force_image = True

    def process_pdf(self, pdf_path, output_dir):
        """
        调用第一个OCR接口提取PDF中的文本及位置信息
        
        参数:
            pdf_path: PDF文件路径（如："test.pdf"）
            force_image: 是否强制将PDF转为图片识别（适合扫描版PDF）
        
        返回:
            OCR识别结果的JSON数据（包含文本和位置信息）
        """
        start_time = time.time()
        url = "http://125.71.97.61:13031/extract-text-with-position-from-pdf"
        
        with open(pdf_path, 'rb') as file:
            files = {'file': file}
            data = {'forceImage': 'true'} if self.force_image else {}
            response = requests.post(url, files=files, data=data)
        response.raise_for_status()
        result = response.json()['data']['pages']
        txts = []
        boxes = []
        for page in result:
            page_index = page['pageNum'] - 1
            for item in page['items']:
                txts.append(item['char'])
                x = item['x'] if item['x'] is not None else 0
                y = item['y'] if item['y'] is not None else 0
                w = item['width'] if item['width'] is not None else 0
                h = item['height'] if item['height'] is not None else 0
                x = int(x)
                y = int(y)
                w = int(w)
                h = int(h)
                boxes.append([page_index, x, y, x+w, y+h])
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
        with open(os.path.join(output_dir, 'result.json'), 'w', encoding='utf-8') as f:
            json.dump({"boxes": boxes, "txts": txts}, f, ensure_ascii=False)
        end_time = time.time()
        print(f"[INFO] OCR processing time: {end_time - start_time:.2f} seconds")
        return boxes, txts

