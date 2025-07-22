import cv2

class ImageProcessor:
    def __init__(self, mosaic_size=10, blur_kernel=(51, 51), color=(0, 0, 0)):
        self.mosaic_size = mosaic_size
        self.blur_kernel = blur_kernel
        self.color = color
        self.COVER_METHODS = {"blur": self.blur, "mosaic":self.mosaic, "black":self.black, "empty":self.empty}
    
    def set_mosaic_size(self, size):
        self.mosaic_size = size
    
    def set_blur_kernel(self, kernel):
        if kernel is None:
            return
        if kernel%2 == 0:
            kernel += 1  # Ensure kernel size is odd
        self.blur_kernel = (kernel, kernel)
    
    def cover(self, img, x, y, w, h, method='blur'):
        """
        Apply a covering method to a specified rectangle area of the image.
        
        Args:
            img: Input image in BGR format (numpy array)
            x, y: Top-left corner coordinates of the area
            w, h: Width and height of the area
            method: Covering method ('blur', 'mosaic', 'black', 'empty')
        
        Returns:
            Image with the specified covering method applied
        """
        if method not in self.COVER_METHODS:
            raise ValueError(f"Unsupported cover method: {method}")
        
        self.COVER_METHODS[method](img, x, y, w, h)

    def hex2rgb(self, hex_color):
        """
        Convert hex color to RGB tuple.
        
        Args:
            hex_color: Hexadecimal color string (e.g., '#FF5733')
        
        Returns:
            Tuple of decimal (R, G, B)
        """
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i + 2], 16) for i in (0, 2, 4))

    def set_color(self, hex_color):
        """
        Set the color for color covering.
        
        Args:
            color: Hexadecimal color string (e.g., '#FF5733')
        """
        if hex_color is None:
            return
        self.color = self.hex2rgb(hex_color)

    def get_valid_coordinates(self, x, y, w, h, img_shape):
        """
        Ensure the coordinates are within the bounds of the image.
        
        Args:
            x, y: Top-left corner coordinates of the rectangle
            w, h: Width and height of the rectangle
            img_shape: Shape of the image (height, width)
        
        Returns:
            Tuple of valid (x, y, w, h)
        """
        h_img, w_img = img_shape[:2]
        x = max(0, x)
        y = max(0, y)
        w = min(w, w_img - x)
        h = min(h, h_img - y)
        
        return x, y, w, h

    def mosaic(self, img, x, y, w, h):
        """
        Mosaic effect on a specified rectangle area of the image.

        Args:
            img: Input image in BGR format (numpy array)
            x, y: Top-left corner coordinates of the area
            w, h: Width and height of the area
            mosaic_size: Size of mosaic blocks (larger = more blurry)
            blur_kernel: Optional blur kernel (ignored in this function)
        
        Returns:
            Image with mosaic effect applied
        """
        x, y, w, h = self.get_valid_coordinates(x, y, w, h, img.shape)
        
        if w <= 0 or h <= 0:
            return img
        roi = img[y:y+h, x:x+w]
        
        roi = cv2.resize(roi, (max(1, w // self.mosaic_size), max(1, h // self.mosaic_size)), interpolation=cv2.INTER_LINEAR)
        roi = cv2.resize(roi, (w, h), interpolation=cv2.INTER_NEAREST)
        
        img[y:y+h, x:x+w] = roi

    def blur(self, img, x, y, w, h):
        """
        Gaussian Blur
        :param blur_kernel: size of the Gaussian kernel (must be odd)
        """
        x, y, w, h = self.get_valid_coordinates(x, y, w, h, img.shape)
        if w <= 0 or h <= 0:
            return img
        roi = img[y:y+h, x:x+w]
        roi = cv2.GaussianBlur(roi, self.blur_kernel, 0)
        img[y:y+h, x:x+w] = roi

    def black(self, img, x, y, w, h):    
        """Cover a specified rectangle area with black color"""
        x, y, w, h = self.get_valid_coordinates(x, y, w, h, img.shape)
        if w <= 0 or h <= 0:
            return img
        img[y:y + h, x:x + w] = self.color

    def empty(img, x, y, w, h):
        pass