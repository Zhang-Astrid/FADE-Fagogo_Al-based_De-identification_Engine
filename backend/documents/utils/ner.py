import torch
from transformers import pipeline 
from collections import defaultdict
from langchain.text_splitter import RecursiveCharacterTextSplitter
import time

class NERModel:
    def __init__(self, gpu):
        device = 0 if torch.cuda.is_available() and gpu else -1
        self.ner = pipeline("token-classification", model="gyr66/Ernie-3.0-base-chinese-finetuned-ner", device=device)
        # Sensitive entities to extract
        self.sensitive_entities = ["B-name", "I-name", "B-company", "I-company", "B-address", "I-address"]
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=512,
            chunk_overlap=64,
            separators=["\n", "。", "，", " ", ""]
        )
    
    def extract_sensitive(self, text):
        """
        Extracts sensitive information from the given text using spaCy's named entity recognition.
        Args:
            text (str): The input text to analyze.
        Returns:
            dict: A dictionary with entity labels as keys and lists of corresponding phrases as values.
        """
        start_time = time.time()
        chunks = self.text_splitter.split_text(text)
        sensitive_info = defaultdict(set)
        for chunk in chunks:
            doc = self.ner(chunk)
            phrase = ""
            entity = ""
            
            single_score_threshold = 0.7
            confidence_threshold = 0.9
            total_score = 0
            count = 0
            for ent in doc:
                if ent['score'] < single_score_threshold:
                    continue
                total_score += ent['score']
                count += 1
                if ent["entity"] in self.sensitive_entities:
                    if ent["entity"].startswith("B-") or entity == "":
                        if len(phrase) > 1 and total_score/count > confidence_threshold:
                            total_score = 0
                            count = 0
                            sensitive_info[entity].add(phrase)
                        entity = ent["entity"][2:]
                        phrase = ent["word"]
                    elif ent["entity"][2:] == entity:   # If the entity is a continuation of the previous phrase, append it
                        phrase += ent["word"]
                    else:   # If new sensitive entity comes, and no "B-" found, then view it as "B-" labeled
                        if len(phrase) > 1 and total_score/count > confidence_threshold:
                            total_score = 0
                            count = 0
                            sensitive_info[entity].add(phrase)
                        entity = ent["entity"][2:]
                        phrase = ent["word"]
                else:
                    if len(phrase) > 1 and total_score/count > confidence_threshold:
                        sensitive_info[entity].add(phrase)
                        phrase = ""
                        entity = ""
            if len(phrase) > 1 and total_score/count > confidence_threshold:
                sensitive_info[entity].add(phrase)
        end_time = time.time()
        print(f"[INFO] NER processing time: {end_time - start_time:.2f} seconds")
        return sensitive_info