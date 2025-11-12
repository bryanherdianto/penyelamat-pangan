import argparse
import numpy as np
from qai_hub_models.utils.args import add_output_dir_arg
from qai_hub_models.utils.onnx_torch_wrapper import OnnxTorchWrapper

def main():
    parser = argparse.ArgumentParser(
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
        description="Deploy a QAI Hub model using ONNX and Torch."
    )
    parser.add_argument(
        "--model",
        type=str,
        required=True,
        help="Path to the QAI Hub model to deploy."
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for reproducibility."
    )
    add_output_dir_arg(parser)
    args = parser.parse_args()

    print("Loading Model on NPU/CPU")
    model = OnnxTorchWrapper(args.model)

    np.random.seed(args.seed)
    sample_input = np.random.rand((1, 10, 3)).astype(np.float32)

    result = model.forward({"input": sample_input})
    print("Model Inference Result:", result)

    if args.output_dir:
        np.save(f"{args.output_dir}/inference_result.npy", result["output_0"])
        print(f"Saved inference result to {args.output_dir}/inference_result.npy")

if __name__ == "__main__":
    main()