from openai import OpenAI
import json
import concurrent.futures
import time

class LLM:
    def __init__(self):
        self.api_key = 'sk-4b70559344e3437ba82a4e4dddcb8cf4'
    
    def request(self, prompt):
        client = OpenAI(
            api_key=self.api_key,
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        )
        response = client.chat.completions.create(
            model="qwen-plus",
            messages=[
                {"role": "system", "content": "你是一个专业的文本分析助手，擅长从文本中提取敏感信息。"},
                {"role": "user", "content": prompt},
            ],
        )
        return response.choices[0].message.content
    
    def extract_sensitive(self, text):
        start_time = time.time()
        categories = ['公司名', '地址', '姓名']
        chunk_size = 100
        overlap = 30
        chunked_text = [
            text[i:i + chunk_size] 
            for i in range(0, len(text), chunk_size - overlap)
        ]
        
        result = {'company': [], 'address': [], 'name': []}
        
        def process_chunk(t):
            prompt = (
                f"{t}\n\n将以上文字中涉及 {' '.join(categories)} 的敏感信息部分提取出来。"
                "其中地址的部分忽略单独的城市名。"
                '格式要严谨遵循{"company":[<text>], "address":[<text>], "name":[<text>]}'
                '请不要添加任何其他内容。'
            )
            response = self.request(prompt)
            try:
                response = '{' + response.split('{')[1].split('}')[0] + '}'
            except Exception as e:
                return {"company": [], "address": [], "name": []}
            response = json.loads(response)

            return response

        with concurrent.futures.ThreadPoolExecutor() as executor:
            futures = [executor.submit(process_chunk, t) for t in chunked_text]
            for future in concurrent.futures.as_completed(futures):
                data = future.result()
                for k, v in data.items():
                    v = [item for item in v if len(item) > 1]
                    result[k].extend(v)
        for k, v in result.items():
            result[k] = set(v)
        end_time = time.time()
        print(f"[INFO] LLM processing time: {end_time - start_time:.2f} seconds")
        return result
