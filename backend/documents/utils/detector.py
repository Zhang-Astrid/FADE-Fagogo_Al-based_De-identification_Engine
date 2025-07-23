import os
import json
import re
from .ocr import OCRProcessor
from .llm import LLM
from .ner import NERModel

class Detector:
    def __init__(self, gpu, model_type='ner'):
        # OCR module
        self.ocr = OCRProcessor()
        self.gpu = gpu
        
        # NLP modules
        self.ner = NERModel()
        self.llm = LLM()

        self.ocr_path = ""  # Directory to save OCR results
        
        self.mode = model_type   # should be one of ner, llm

    def set_mode(self, mode):
        '''Set mode of detector, ner or llm'''
        self.mode = mode

    def get_text_from_pdf(self, pdf_path):
        # Check if the output directory exists, if not, process the image
        if not os.path.exists((self.ocr_path)):
            print(f"[INFO] Processing OCR for {pdf_path}")
            self.ocr.process_pdf(pdf_path, self.ocr_path, self.gpu)
        # Read the JSON file to get the text and bounding boxes
        print(f"[INFO] Reading OCR results from {self.ocr_path}")
        with open(self.ocr_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        boxes = data['boxes']
        texts = data['txts']
        return texts, boxes
    
    def extract_sensitive(self, text):
        """
        Extracts sensitive information from the given text using spaCy's named entity recognition.
        Args:
            text (str): The input text to analyze.
        Returns:
            dict: A dictionary with entity labels as keys and lists of corresponding phrases as values.
        """

        if self.mode == 'ner':
            sensitive_info = self.ner.extract_sensitive(text)
        elif self.mode == 'llm':
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    sensitive_info = self.llm.extract_sensitive(text)
                    break
                except Exception as e:
                    print(f"[INFO] LLM 第 {attempt + 1} 次尝试失败: {str(e)}")
                    if attempt == max_retries - 1:
                        print("[INFO] LLM 三次尝试均失败，回退到 NER")
                        sensitive_info = self.ner.extract_sensitive(text)
        else:
            print(f"[ERROR]: Unrecognized mode {self.mode}. Detector mode should be one of ner and llm.")
        sensitive_info["sens_number"] = re.findall(r'[a-zA-Z0-9-]+', text)  # Find long numbers (e.g., phone numbers, id numbers, account)
        filtered_numbers = [text for text in sensitive_info["sens_number"] if re.search(r'\d', text) and len(re.findall(r'\d', text)) >= 5]
        sensitive_info["sens_number"] = filtered_numbers
        # \b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b
        sensitive_info["email"] = re.findall(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z0-9]{2,}', text)  # Find email addresses
        return sensitive_info

    def get_sens_info_loc(self, pdf_path):
        """
        Args:
            sens_info (dict): A dictionary where keys are sensitive information types and values are lists of phrases.
        Returns:
            sens_info_loc (dict):   A dictionary where keys are sensitive information types,
                                    and values are bounding boxes for the sensitive information phrases found in the image.
        """
        texts, boxes = self.get_text_from_pdf(pdf_path)
        sentence = "".join(texts)
        print(f"[INFO] Extracting sensitive information using {self.mode} model.")
        sens_info = self.extract_sensitive(sentence)
        # 'n' starting means no '\n' version variables
        newline_num = 0
        nl_nums = []    # list of numbers indicating the number of '\n' before each character
        for text, box in zip(texts, boxes):
            if text != '\n':
                nl_nums.append(newline_num)
            else:
                newline_num += 1
        n_sentence = sentence.replace('\n', '')
        sens_info_loc = {}

        # 处理敏感信息坐标重叠的问题
        locs = []
        for key, phrases in sens_info.items():
            for phrase in phrases:
                n_indexes = [match.start() for match in re.finditer(re.escape(phrase), n_sentence)]
                for start in n_indexes:
                    end = start + len(phrase)
                    locs.append((start, end))
        locs.sort(key=lambda x: x[0])  # Sort by start index
        # Merge overlapping locations
        merged_locs_dict = {}
        merged_locs = set()
        i = 0
        while i < len(locs):
            merge_loc = locs[i]
            keys = [locs[i]]
            for j in range(i + 1, len(locs)):
                if locs[j][0] < merge_loc[1]:
                    merge_loc = (min(merge_loc[0], locs[j][0]), max(merge_loc[1], locs[j][1]))
                    keys.append(locs[j])
                else:
                    break
            i = i + len(keys)
            for key in keys:
                merged_locs.add(key)
            merged_locs_dict[keys[0]] = merge_loc   # 不同敏感信息只需要保留一个即可，不然会重复处理，对应的种类与图片处理方法就随机选了第一个，标记为“选中”

        for key, phrases in sens_info.items():
            sens_loc = []
            for phrase in phrases:
                n_indexes = [match.start() for match in re.finditer(re.escape(phrase), n_sentence)]
                for n_start in n_indexes:
                    nl_pos = [] # positions of the word just before '\n' in the phrase
                    last_nl = nl_nums[n_start]
                    
                    if (n_start, n_start + len(phrase)) in merged_locs:
                        if (n_start, n_start + len(phrase)) in merged_locs_dict.keys():
                            n_start, n_end = merged_locs_dict[(n_start, n_start + len(phrase))]   # 是“选中”的敏感信息
                        else:
                            continue    # 若此点未被”选中“，则跳过
                    else:
                        n_end = n_start + len(phrase)
                    
                    for i in range(n_start, n_end):
                        if nl_nums[i] != last_nl:
                            last_nl = nl_nums[i]
                            nl_pos.append(i-1)
                    n_box_start_i = n_start
                    for n_box_end_i in nl_pos:
                        box_start_i = n_box_start_i + nl_nums[n_box_start_i]
                        box_start = boxes[box_start_i]
                        box_end_i = n_box_end_i + nl_nums[n_box_end_i]
                        box_end = boxes[box_end_i]
                        box = [box_start[0], box_start[1], box_start[2], box_end[3]-box_start[1], box_end[4]-box_start[2]]
                        sens_loc.append(box)
                        n_box_start_i = n_box_end_i + 1
                    box_start_i = n_box_start_i + nl_nums[n_box_start_i]
                    box_start = boxes[box_start_i]
                    n_box_end_i = n_end - 1
                    box_end_i = n_box_end_i + nl_nums[n_box_end_i]
                    box_end = boxes[box_end_i]
                    box = [box_start[0], box_start[1], box_start[2], box_end[3]-box_start[1], box_end[4]-box_start[2]]
                    sens_loc.append(box)
            sens_info_loc[key] = sens_loc
        return sens_info_loc
