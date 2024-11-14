import { Types } from "mongoose";

export function parseObject(id: string) {
    return new Types.ObjectId(id);
}