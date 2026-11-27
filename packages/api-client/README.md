# @fnb/api-client

HTTP client có kiểu của API, hook TanStack Query và (từ M1-26) socket client. Không chứa giao diện; chỉ import `@fnb/contract`. App dùng thẳng mã nguồn (không build).

## Khởi tạo trong app

```ts
// apps/<app>/src/lib/api.ts
export const api = createApiClient({
  baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:4000',
  tokenStore: createStorageTokenStore(window.localStorage, 'fnb.admin.session'),
  getBranchId: () => selectedBranchId, // M1-18
});
export const queryClient = createQueryClient();

// main.tsx
<ApiProvider client={api} queryClient={queryClient}>…</ApiProvider>
```

## Thành phần

| Export | Làm gì |
|---|---|
| `createApiClient(options)` | `{ http, auth }`: HTTP client và các hàm của từng module API |
| `createHttpClient(options)` | `get`, `getPage`, `post`, `put`, `patch`, `delete`. Mỗi hàm nhận schema Zod của `@fnb/contract`, bóc `{ data }` và parse; `getPage` trả `{ data, meta }`. `emptySchema` cho phản hồi 204 |
| `TokenStore`, `createStorageTokenStore`, `createMemoryTokenStore` | Nơi giữ cặp token. Bản Web Storage parse bằng Zod mỗi lần đọc; giá trị hỏng coi như chưa đăng nhập; storage bị chặn thì giữ trong bộ nhớ |
| `ApiError`, `isApiError`, `errorMessageKey` | Mọi lỗi là `ApiError` (`code`, `status`, `params`, `issues`, `requestId`). `errorMessageKey` trả key i18n (`errors:<CODE>`, `errors:network`, `errors:generic`) để màn hình gọi `t()` |
| `createQueryClient()` | Query chỉ thử lại khi mất mạng hoặc lỗi 5xx (tối đa 2 lần), không thử lại lỗi nghiệp vụ; mutation không tự thử lại |
| `ApiProvider`, `useApi` | Cấp client và cache cho cây React. Phiên kết thúc hẳn thì `me` thành `null` và cache khác bị xoá |
| `queryKeys` | Key của mọi query, để invalidate khớp với hook |
| `useMe`, `useLogin`, `useLogout`, `useChangePin`, `useChangePassword`, `meQueryOptions` | Hook của module `auth`. `useMe` trả `null` khi chưa đăng nhập, không gọi API |
| `useBranches`, `useBranch`, `useBranchSettings`, `useCreateBranch`, `useUpdateBranch`, `useSetBranchActive`, `useUpdateBranchSettings` | Module `branches` (M1-19). Mutation tải lại danh sách chi nhánh và `me` (`me` chứa tên, trạng thái chi nhánh) |
| `useUsers`, `useUser`, `useUserAccess`, `useCreateUser`, `useUpdateUser`, `useSetUserActive`, `useAssignRole`, `useResetPin`, `useUnlockUser` | Module `users` (M1-20). `useUsers` giữ trang cũ khi tải trang mới. PIN tạm khi đặt lại do màn hình sinh rồi gửi lên |
| `usePermissionCatalog`, `useRoles`, `useRole`, `useCreateRole`, `useCloneRole`, `useUpdateRole`, `useRestoreRoleDefault`, `useDeleteRole` | Module nhóm quyền (M1-20). Mutation tải lại nhóm, nhân viên và `me` vì quyền của người đang dùng có thể đổi theo |
| `useDevices`, `useRevokeDevice` | Module `devices` phía Admin (M1-21); đăng ký thiết bị chạy trên POS |
| `useAuditLogs` | Module `audit` (M1-21): tìm nhật ký theo người, tiền tố hành động, đối tượng, khoảng thời gian, phạm vi |

## Header gửi kèm

| Header | Nguồn |
|---|---|
| `Authorization: Bearer <access token>` | `tokenStore`, trừ request có `auth: false` |
| `X-Branch-Id` | `getBranchId()`; request truyền `branchId: null` để bỏ (`/auth/me`, đăng xuất) |
| Header khác (`X-Device-Token` trên POS) | `getHeaders()` |

## Tự refresh token (CORE-15)

1. Request bị `401 TOKEN_EXPIRED` → refresh một lần rồi gửi lại request đó.
2. Nhiều request hỏng cùng lúc dùng chung **một** lần refresh.
3. Refresh chạy trong Web Lock `fnb-auth-refresh`; trước khi gọi server, đọc lại token: tab khác đã xoay vòng thì dùng cặp mới, không dùng lại refresh token cũ (server coi đó là bị lộ và kết thúc phiên).
4. Server từ chối refresh (401) hoặc trả `UNAUTHENTICATED` → xoá token, gọi các listener `http.onSessionExpired`.
5. Refresh hỏng vì mất mạng hoặc 5xx → giữ token, ném `NETWORK_ERROR`/lỗi server; lần sau thử lại.

## Thêm một module API

1. `src/<module>/<module>-api.ts`: hàm thuần nhận `HttpClient` (`createXxxApi(http)`), dùng schema của contract; thêm vào `createApiClient`.
2. `src/<module>/use-<module>.ts`: hook Query/Mutation; key thêm vào `queryKeys`; mutation invalidate đúng key.
3. Test bằng `createFakeFetch` (`src/test/fake-api.ts`), không gọi server thật.
