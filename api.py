from flask import Flask
from flask import request
from flask import jsonify
from flask import Response
import json
import cv2
import numpy as np
import supervision as sv
from supervision.draw.color import Color

import torch
import torchvision

from GroundingDINO.groundingdino.util.inference import Model
# from groundingdino.util.inference import Model
# from LightHQSAM.setup_light_hqsam import setup_model
from segment_anything import sam_model_registry, SamPredictor


DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

GROUNDING_DINO_CONFIG_PATH = "GroundingDINO/groundingdino/config/GroundingDINO_SwinT_OGC.py"
GROUNDING_DINO_CHECKPOINT_PATH = "groundingdino_swint_ogc.pth"

# GROUNDING_DINO_CONFIG_PATH = "../GroundingDINO/groundingdino/config/GroundingDINO_SwinT_OGC.py"
# GROUNDING_DINO_CHECKPOINT_PATH = "../groundingdino_swint_ogc.pth"

# Segment-Anything checkpoint
SAM_ENCODER_VERSION = "vit_h"
SAM_CHECKPOINT_PATH = "./sam_vit_h_4b8939.pth"

# HQSAM_CHECKPOINT_PATH = "../sam_hq_vit_tiny.pth"
# checkpoint = torch.load(HQSAM_CHECKPOINT_PATH)
# light_hqsam = setup_model()
# light_hqsam.load_state_dict(checkpoint, strict=True)
# light_hqsam.to(device=DEVICE)


grounding_dino_model = Model(model_config_path=GROUNDING_DINO_CONFIG_PATH,
                             model_checkpoint_path=GROUNDING_DINO_CHECKPOINT_PATH)
sam = sam_model_registry[SAM_ENCODER_VERSION](checkpoint=SAM_CHECKPOINT_PATH)
sam.to(device=DEVICE)
sam_predictor = SamPredictor(sam)

# sam_predictor = SamPredictor(light_hqsam)

app = Flask(__name__)

# Prompting SAM with detected boxes


def segment_image(sam_predictor: SamPredictor, image: np.ndarray, xyxy: np.ndarray) -> np.ndarray:
    sam_predictor.set_image(image)
    result_masks = []
    for box in xyxy:
        masks, scores, logits = sam_predictor.predict(
            box=box,
            multimask_output=True
        )
        index = np.argmax(scores)
        result_masks.append(masks[index])
    return np.array(result_masks)


@app.route("/")
def hello():
    return "Hello World from Flask in a uWSGI Nginx Docker container with \
     Python 3.8 (from the example template)"


@app.route('/segment', methods=['POST'])
def segment():
    if 'image' not in request.files:
        return 'No image part', 400
    file = request.files['image']
    if file.filename == '':
        return 'No selected file', 400

    # Get JSON data from form data
    json_str = request.form.get('json_data')
    if not json_str:
        return 'No JSON data provided', 400

    # Parse JSON data
    try:
        print(json_str)
        json_data = json.loads(json_str)
        if not isinstance(json_data, dict):
            return 'JSON data should be an object', 400
    except json.JSONDecodeError:
        return 'Invalid JSON data', 400

    prompt = json_data.get('prompt', '')
    box_threshold = json_data.get('box_threshold', 0.25)
    text_threshold = json_data.get('text_threshold', 0.25)
    nms_threshold = json_data.get('nms_threshold', 0.8)
    only_mask = json_data.get('only_mask', False)
    # if prompt contains a comma, split it into multiple prompts
    classes = [prompt]
    if ',' in prompt:
        classes = prompt.split(',')

    # Read the image into memory
    filestr = file.read()
    npimg = np.frombuffer(filestr, np.uint8)

    # Convert the image data to an image
    image = cv2.imdecode(npimg, cv2.COLOR_BGR2RGB)

    detections = grounding_dino_model.predict_with_classes(
        image=image,
        classes=classes,
        box_threshold=box_threshold,
        text_threshold=text_threshold
    )
    print(detections)

    # box_annotator = sv.BoxAnnotator()
    # labels = [
    #     f"{classes[class_id]} {confidence:0.2f}"
    #     for _, _, confidence, class_id, _
    #     in detections]
    # annotated_frame = box_annotator.annotate(
    #     scene=image.copy(), detections=detections, labels=labels)

    nms_idx = torchvision.ops.nms(
        torch.from_numpy(detections.xyxy),
        torch.from_numpy(detections.confidence),
        nms_threshold
    ).numpy().tolist()

    detections.xyxy = detections.xyxy[nms_idx]
    detections.confidence = detections.confidence[nms_idx]
    detections.class_id = detections.class_id[nms_idx]

    detections.mask = segment_image(
        sam_predictor=sam_predictor,
        image=cv2.cvtColor(image, cv2.COLOR_BGR2RGB),
        xyxy=detections.xyxy
    )

    #box_annotator = sv.BoxAnnotator()
    mask_annotator = sv.MaskAnnotator(
        color=Color.from_hex(color_hex="#ffffff")
    )
    labels = [
        f"{classes[class_id]} {confidence:0.2f}"
        for _, _, confidence, class_id, _
        in detections]

    # draw the mask on the black image
    if only_mask:
        annotated_image = mask_annotator.annotate(
            scene=np.zeros(image.shape, dtype=np.uint8), detections=detections, opacity=1.0)
    else:
        annotated_image = mask_annotator.annotate(
            scene=image.copy(), detections=detections)

    # annotated_image = box_annotator.annotate(
    #    scene=annotated_image, detections=detections, labels=labels)

    # Encode the processed image to JPG format
    _, buffer = cv2.imencode('.jpg', annotated_image)
    image_in_bytes = buffer.tobytes()

    # Return the image as a response
    return Response(response=image_in_bytes, status=200, mimetype='image/jpeg')


if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True, port=8765)


# curl - X POST - H "Content-Type: multipart/form-data" \
#     - F "image=./vendels_part.png" \
#     - F "json_data={\"promp\": \"Tree\"}" \
#     http: // 130.241.23.151: 8765/segment
