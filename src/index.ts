import axios, { AxiosError } from "axios";
import * as FormData from "form-data";
import * as fs from "fs";

const baseUrl = "https://api-upscaler-origin.icons8.com/api/frontend/v1";

type file = {
    ext: string;
    mime: string
}

class Icons8 {
    auth = baseUrl + "/auth";
    create = baseUrl + "/batches";
    userId = "";
    headers = {
        Origin: "https://icons8.com",
        Referer: "https://icons8.com/",
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    };
    async getUserId() {
        const response = await axios
            .post(this.auth, null, {
                headers: {
                    ...this.headers,
                    "X-User-Id": this.userId,
                },
            })
            .catch((err) => err);
        if (response instanceof AxiosError) {
            console.log(
                response?.response?.status,
                response?.response?.data,
                "at getUserId"
            );
            return "Internal server error";
        }
        const data = response.data;
        this.userId = data["id"];
        return this.userId;
    }

    async createTask() {
        if (!this.userId) {
            await this.getUserId();
        }
        const response = await axios
            .post(this.create, null, {
                headers: {
                    "X-User-Id": this.userId,
                    ...this.headers,
                },
            })
            .catch((err) => err);
        if (response instanceof AxiosError) {
            console.log(
                response?.response?.status,
                response?.response?.data,
                "at createTask"
            );
            return "Internal server error";
        }
        return response.data["id"];
    }

    async Upscale(imageData: Buffer, fileType: file) {
        const taskId = await this.createTask();
        const formData = new FormData();
        formData.append("image", imageData, { filename: `image.${fileType.ext}`, contentType: fileType.mime });
        formData.append("enhance_faces", "true");
        const response = await axios
            .post(this.create + `/${taskId}`, formData, {
                headers: {
                    "X-User-Id": this.userId,
                    ...formData.getHeaders(this.headers),
                },
            })
            .catch((err) => err);
        if (response instanceof AxiosError) {
            if (response?.response?.status === 413) {
                return "File too large";
            };
            console.log(
                response?.response?.status,
                response?.response?.data,
                "at Upscale"
            );
            return "Internal server error";
        };
        return response.data;
    }
}

async function Upscale() {
    const client = new Icons8();
    const image = fs.readFileSync("./public/image.jpg");
    const signature = image.toString("hex", 0, 4);
    let fileType: file;
    if (signature === "89504e47") {
        fileType = {
            ext: "png",
            mime: "image/png",
        };
    } else if (signature === "ffd8ffe0" || signature === "ffd8ffe1") {
        fileType = {
            ext: "jpg",
            mime: "image/jpeg",
        };
    } else {
        return "Invalid file type";
    };
    const output = await client.Upscale(image, fileType);
    return output;
}

Upscale().then(console.log).catch(console.error);
