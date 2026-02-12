// lib/api/response.ts

import { NextResponse } from "next/server";
import { ZodError, ZodIssue } from "zod";
import { AUTH_CONFIG } from "@/lib/auth/config";

interface ApiError {
  message: string;
  code: string;
}

interface SuccessResponseData {
  success: true;
  data: unknown;
}

interface ErrorResponseData {
  success: false;
  error: ApiError;
}

export function successResponse(data: unknown, status = 200): NextResponse<SuccessResponseData> {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(
  message: string,
  status = 400,
  code = "ERROR"
): NextResponse<ErrorResponseData> {
  return NextResponse.json(
    { success: false, error: { message, code } },
    { status }
  );
}

export function handleApiError(error: unknown): NextResponse<ErrorResponseData> {
  if (error instanceof ZodError) {
    const issues = error.issues as ZodIssue[];
    const message = issues.map((e: ZodIssue) => e.message).join(", ");
    return errorResponse(message, 400, "VALIDATION_ERROR");
  }

  if (error instanceof Error) {
    // Don't expose internal errors in production
    const message =
      process.env.NODE_ENV === "development"
        ? error.message
        : "An unexpected error occurred";

    return errorResponse(message, 500, "INTERNAL_ERROR");
  }

  return errorResponse("An unexpected error occurred", 500, "INTERNAL_ERROR");
}

export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string
): NextResponse {
  const { COOKIE_OPTIONS } = AUTH_CONFIG;

  response.cookies.set("access_token", accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60, // 15 minutes
  });

  response.cookies.set("refresh_token", refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  return response;
}

export function clearAuthCookies(response: NextResponse): NextResponse {
  const { COOKIE_OPTIONS } = AUTH_CONFIG;

  response.cookies.set("access_token", "", {
    ...COOKIE_OPTIONS,
    maxAge: 0,
  });

  response.cookies.set("refresh_token", "", {
    ...COOKIE_OPTIONS,
    maxAge: 0,
  });

  return response;
}