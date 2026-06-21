export interface ApiSuccessResponse<T> {
    success: true;
    description: string;
    body: T;
}
export interface ApiErrorResponse {
    success: false;
    description: string;
}
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
