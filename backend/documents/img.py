import cv2

def get_valid_coordinates(x, y, w, h, img_shape):
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

def mosaic(img, x, y, w, h, mosaic_size, blur_kernel):
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
    x, y, w, h = get_valid_coordinates(x, y, w, h, img.shape)
    
    if w <= 0 or h <= 0:
        return img
    roi = img[y:y+h, x:x+w]
    
    roi = cv2.resize(roi, (max(1, w // mosaic_size), max(1, h // mosaic_size)), interpolation=cv2.INTER_LINEAR)
    roi = cv2.resize(roi, (w, h), interpolation=cv2.INTER_NEAREST)
    
    img[y:y+h, x:x+w] = roi

def blur(img, x, y, w, h, mosaic_size, blur_kernel):
    """
    Gaussian Blur
    :param blur_kernel: size of the Gaussian kernel (must be odd)
    """
    x, y, w, h = get_valid_coordinates(x, y, w, h, img.shape)
    if w <= 0 or h <= 0:
        return img
    roi = img[y:y+h, x:x+w]
    roi = cv2.GaussianBlur(roi, blur_kernel, 0)
    img[y:y+h, x:x+w] = roi

def black(img, x, y, w, h, mosaic_size, blur_kernel):    
    """Cover a specified rectangle area with black color"""
    x, y, w, h = get_valid_coordinates(x, y, w, h, img.shape)
    if w <= 0 or h <= 0:
        return img
    img[y:y + h, x:x + w] = (0, 0, 0)

def empty(img, x, y, w, h, mosaic_size, blur_kernel):
    pass