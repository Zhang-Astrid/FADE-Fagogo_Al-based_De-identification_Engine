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
    # 从配置中提取处理选项
    compute_mode = config.get('compute_mode', 'cpu')
    model_type = config.get('model_type', 'ocr')
    
    # Initialize the detector with specified options
    detector = Detector(compute_mode=compute_mode, model_type=model_type)
    pdf_file = 'origin.pdf'
    pdf_path = os.path.join(root_path, pdf_file)
    print(f"Processing {pdf_path} with compute_mode={compute_mode}, model_type={model_type}")
    
    # 存储处理结果
    processing_results = {}
    total_pages = 0
    processed_pages = 0
        
    # Convert PDF pages to numpy type images
    imgs = convert_from_path(pdf_path, dpi=300, fmt="png")
    imgs_bin = [cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR) for image in imgs]
    total_pages = len(imgs_bin)
    
    for i, img in enumerate(imgs_bin):
        output_dir = os.path.join(root_path, f"ocr/page_{i + 1}/")
        detector.output_dir = output_dir 
        sens_info_locs = detector.get_sens_info_loc(img)
        count = 0
        
        # 记录当前页面的处理结果
        page_results = {}
        
        for k, v in sens_info_locs.items():
            count += len(v)
            if k in config.keys():
                # 记录该字段在当前页面的识别情况
                if k not in page_results:
                    page_results[k] = {
                        'detected_count': 0,
                        'confidence': 0.0,
                        'method': config[k]
                    }
                
                page_results[k]['detected_count'] += len(v)
                # 计算平均置信度（这里简化处理）
                page_results[k]['confidence'] = min(0.95, 0.6 + len(v) * 0.1)
                
                for x, y, w, h in v:
                    COVER_METHODS[config[k]](img, x, y, w, h, mosaic_size=MOSAIC_SIZE, blur_kernel=BLUR_KERNEL)
        
        # 合并页面结果到总结果
        for field_name, result in page_results.items():
            if field_name not in processing_results:
                processing_results[field_name] = {
                    'total_detected': 0,
                    'total_pages': 0,
                    'method': result['method'],
                    'confidence': 0.0
                }
            
            processing_results[field_name]['total_detected'] += result['detected_count']
            processing_results[field_name]['total_pages'] += 1
            processing_results[field_name]['confidence'] = max(
                processing_results[field_name]['confidence'], 
                result['confidence']
            )
        
        if count == 0:
            print(f"No sensitive information found on page {i + 1} of {pdf_file}.")
        else:
            print(f"Found sensitive information on page {i + 1} of {pdf_file}.")
            processed_pages += 1
    
    # 生成最终图像
    imgs = []
    for img in imgs_bin:
        _, buffer = cv2.imencode(".png", img)
        imgs.append(buffer.tobytes())

    # 直接生成到 FileField 目标路径
    user = config.get('__user')  # 兼容性处理，实际调用时传递 user
    document_code = config.get('__document_code')
    if user is not None and document_code is not None:
        processed_pdf_path = os.path.join('media', user, document_code, f"processed_{config_hash}.pdf")
    else:
        # 兼容旧调用方式
        processed_pdf_path = os.path.join(root_path, f"processed_{config_hash}.pdf")
    os.makedirs(os.path.dirname(processed_pdf_path), exist_ok=True)
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
