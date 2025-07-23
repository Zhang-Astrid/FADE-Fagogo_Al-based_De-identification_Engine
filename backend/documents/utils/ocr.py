import requests

class OCRProcessor:
    def __init__(self):
        self.base_url = "http://127.0.0.1:30000/ocr"

    def process_pdf(self, pdf_path, output_dir, gpu=True):
        response = requests.post(
            self.base_url,
            json={"pdf_path": pdf_path, "output_dir": output_dir, "gpu": gpu},
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        return response.json()

