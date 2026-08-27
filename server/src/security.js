import crypto from "node:crypto";


export function generateAccessCode() {

    const number =
        crypto.randomInt(0, 10000);

    return number
        .toString()
        .padStart(4, "0");
}


export function hashAccessCode(code) {

    return crypto
        .createHash("sha256")
        .update(code)
        .digest("hex");
}


export function generateFileId() {

    return crypto.randomUUID();
}


export function generateStorageKey(fileId) {

    return `files/${fileId}`;
}