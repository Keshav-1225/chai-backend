import jwt from "jsonwebtoken"
export interface TokenPayload extends jwt.JwtPayload {
  _id: string;
}

export interface channelUsernameParams {
    username: string
}