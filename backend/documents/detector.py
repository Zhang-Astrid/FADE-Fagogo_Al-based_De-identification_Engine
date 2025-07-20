from transformers import pipeline
import os
import json
from collections import defaultdict
from rapidocr import RapidOCR
import re

class Detector:
    def __init__(self, compute_mode='cpu', model_type='ner'):
        # 存储配置选项
        self.compute_mode = compute_mode
        self.model_type = model_type
        
        # NER module
        self.ocr = RapidOCR()
        
        # NLP module - 根据模型类型选择不同的模型
        if model_type == 'ner':
            # 使用NER模式，保持原有的NER模型
            self.ner = pipeline("token-classification", model="gyr66/Ernie-3.0-base-chinese-finetuned-ner")
        elif model_type == 'llm':
            # 使用LLM模式，这里可以集成大语言模型
            # TODO: 集成具体的LLM模型
            self.ner = pipeline("token-classification", model="gyr66/Ernie-3.0-base-chinese-finetuned-ner")
            print(f"LLM模式暂未实现，使用默认NER模型")
        else:
            raise ValueError(f"不支持的模型类型: {model_type}")

        # Sensitive entities to extract
        self.sensitive_entities = ["B-name", "I-name", "B-company", "I-company", "B-address", "I-address"]

        self.output_dir = ""  # Directory to save NER results
        
        print(f"Detector initialized with compute_mode={compute_mode}, model_type={model_type}")

    def ocr_process(self, img):
        result = self.ocr(img, return_word_box=True, return_single_char_box=True)
        os.makedirs(os.path.dirname(self.output_dir), exist_ok=True)
        boxes = []
        txts = []
        for line in result.word_results:
            for r in line:
                txt, _, box = r
                boxes.append(box)
                txts.append(txt)
            txts.append('\n')
            boxes.append(box)
        # boxes = [[p0[0], p0[1], p2[0]-p0[0], p2[1]-p0[1]] for p0, p1, p2, p3 in boxes]  # Convert to [x, y, width, height]
        boxes = [[p0[0], p0[1], p2[0], p2[1]] for p0, p1, p2, p3 in boxes]
        with open(os.path.join(self.output_dir, 'result.json'), 'w', encoding='utf-8') as f:
            json.dump({"boxes": boxes, "txts": txts}, f, ensure_ascii=False)

    def get_text_from_image(self, img):
        # Check if the output directory exists, if not, process the image
        if not os.path.exists(self.output_dir):
            self.ocr_process(img)
        # Read the JSON file to get the text and bounding boxes
        for file in os.listdir(self.output_dir):
            if file.endswith("json"):
                with open(os.path.join(self.output_dir, file), 'r', encoding='utf-8') as f:
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
        doc = self.ner(text)
        sensitive_info = defaultdict(set)
        phrase = ""
        entity = ""
        
        single_score_threshold = 0.6
        confidence_threshold = 0.9
        total_score = 0
        count = 0
        for ent in doc:
            (f"Entity: {ent['word']}, Label: {ent['entity']}, Confidence: {ent['score']}")
            if ent['score'] < single_score_threshold:
                continue
            total_score += ent['score']
            count += 1
            if ent["entity"] in self.sensitive_entities:
                if ent["entity"].startswith("B-") or entity == "":
                    if len(phrase) > 1 and total_score/count > confidence_threshold:
                        # print(f"Phrase: {phrase}, Label: {entity}, Confidence: {total_score/count}")
                        total_score = 0
                        count = 0
                        sensitive_info[entity].add(phrase)
                    entity = ent["entity"][2:]
                    phrase = ent["word"]
                elif ent["entity"][2:] == entity:   # If the entity is a continuation of the previous phrase, append it
                    phrase += ent["word"]
                else:   # If new sensitive entity comes, and no "B-" found, then view it as "B-" labeled
                    if len(phrase) > 1 and total_score/count > confidence_threshold:
                        # print(f"Phrase: {phrase}, Label: {entity}, Confidence: {ent['score']}")
                        total_score = 0
                        count = 0
                        sensitive_info[entity].add(phrase)
                    entity = ent["entity"][2:]
                    phrase = ent["word"]
            else:
                if len(phrase) > 1 and total_score/count > confidence_threshold:
                    # print(f"Phrase: {phrase}, Label: {entity}, Confidence: {total_score/count}")
                    sensitive_info[entity].add(phrase)
                    phrase = ""
                    entity = ""
        if len(phrase) > 1 and total_score/count > confidence_threshold:
            # print(f"Phrase: {phrase}, Label: {entity}, Confidence: {total_score/count}")
            sensitive_info[entity].add(phrase)

        sensitive_info["sens_number"] = re.findall(r'\b[a-zA-Z0-9-]+\b', text)  # Find long numbers (e.g., phone numbers, id numbers, account)
        filtered_numbers = [text for text in sensitive_info["sens_number"] if re.search(r'\d', text) and len(text) > 5]
        sensitive_info["sens_number"] = filtered_numbers
        sensitive_info["email"] = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b', text)  # Find email addresses

        return sensitive_info

    def get_sens_info_loc(self, img):
        """
        Args:
            sens_info (dict): A dictionary where keys are sensitive information types and values are lists of phrases.
        Returns:
            sens_info_loc (dict):   A dictionary where keys are sensitive information types,
                                    and values are bounding boxes for the sensitive information phrases found in the image.
        """
        texts, boxes = self.get_text_from_image(img)
        sentence = "".join(texts)
        sens_info = self.extract_sensitive(sentence)

        box_to_index = {}   # Mapping from box to its index range in char_to_box
        char_to_box = []    # List mapping each character index to its corresponding box
        for text, box in zip(texts, boxes):
            head = len(char_to_box)
            for _ in text:
                char_to_box.append(box)
            tail = len(char_to_box)
            box_to_index[tuple(box)] = (head, tail)
        
        # 'n' starting means no '\n' version variables

        newline_num = 0
        nl_nums = []
        for text, box in zip(texts, boxes):
            if text != '\n':
                nl_nums.append(newline_num)
            else:
                newline_num += 1
        n_sentence = sentence.replace('\n', '')
        sens_info_loc = {}
        for key, phrases in sens_info.items():
            sens_loc = []
            phrases = set(phrases)
            for phrase in phrases:
                n_indexes = [match.start() for match in re.finditer(phrase, n_sentence)]
                for n_start in n_indexes:
                    nl_pos = [] # positions of the word just before '\n' in the phrase
                    last_nl = nl_nums[n_indexes[0]]
                    for i in range(n_start, n_start + len(phrase)):
                        if nl_nums[i] != last_nl:
                            last_nl = nl_nums[i]
                            nl_pos.append(i-1)
                    n_box_start_i = n_start
                    for n_box_end_i in nl_pos:
                        box_start_i = n_box_start_i + nl_nums[n_box_start_i]
                        box_start = boxes[box_start_i]
                        box_end_i = n_box_end_i + nl_nums[n_box_end_i]
                        box_end = boxes[box_end_i]
                        box = [box_start[0], box_start[1], box_end[2]-box_start[0], box_end[3]-box_start[1]]
                        sens_loc.append(box)
                        n_box_start_i = n_box_end_i + 1
                    box_start_i = n_box_start_i + nl_nums[n_box_start_i]
                    box_start = boxes[box_start_i]
                    n_box_end_i = n_start + len(phrase) - 1
                    box_end_i = n_box_end_i + nl_nums[n_box_end_i]
                    box_end = boxes[box_end_i]
                    box = [box_start[0], box_start[1], box_end[2]-box_start[0], box_end[3]-box_start[1]]
                    sens_loc.append(box)
            sens_info_loc[key] = sens_loc
        return sens_info_loc
