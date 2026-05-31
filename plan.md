## Plan: Nâng cấp frontend task cho nhân viên

TL;DR: Frontend hiện mới có shell nhân viên + onboarding, trong khi backend đã có gần như đầy đủ API task. Kế hoạch là xây một task workspace cho nhân viên trong app shell hiện tại, dùng chung dữ liệu backend cho list/kanban/detail/progress/comment/attachment/history, và chỉ giữ phạm vi staff-facing để bám đúng Sprint 2.

**Steps**
1. Chốt phạm vi UI và API contract cho luồng nhân viên dựa trên các backlog PB079-PB118, ưu tiên các nhóm có backend sẵn: list/kanban/detail/search/filter/sort/status/progress/checklist/comments/attachments/history/extension request. Phần manager review chỉ giữ ở mức phụ thuộc backend, không triển khai UI manager trong plan này.
2. Thiết kế lại cấu trúc điều hướng frontend quanh `AppShell` hiện tại để thêm khu vực task chuyên dụng cho nhân viên, thay vì nhồi tiếp vào `EmployeeHomePage`. Mục tiêu là có một entry point rõ ràng cho task workspace và giữ onboarding/homepage gọn.
3. Thêm lớp API client và type/schema ở frontend để map trực tiếp các response task hiện có từ backend: list, kanban, task detail, checklist, attachment, status/progress update, search/filter params, overdue flags, and deadline countdown data. Ưu tiên tái dùng kiểu dữ liệu hiện có từ `frontend/src/types/auth.ts` và tách task types riêng để tránh state rối.
4. Xây task workspace cho nhân viên với 2 chế độ chuyển đổi: List View và Kanban View. List View cần phục vụ PB079, PB080, PB105-PB116; Kanban View cần phục vụ PB081-PB086 và hiển thị counts realtime theo response `/tasks/kanban`.
5. Xây panel chi tiết task dạng drawer bên phải cho PB083, PB092, PB088, PB089, PB071, PB072, PB099. Drawer phải hiển thị mô tả, assignees, deadline, progress, checklist, comments/timeline, file attachments, và form yêu cầu gia hạn deadline.
6. Tổ chức các tương tác chỉnh sửa task theo hướng đồng bộ ngay trong workspace: kéo thả đổi trạng thái, cập nhật progress %, checkbox checklist, thêm note/comment, upload attachment, và tự chuyển trạng thái khi đạt 100%. Đảm bảo các hành vi tự động này phản ánh đúng backend hiện có, đặc biệt các endpoint update status/progress/checklist và logic tự cập nhật progress.
7. Bổ sung khối lọc/tìm kiếm/sắp xếp cho task list để cover PB105-PB116: search realtime, autocomplete gợi ý, highlight từ khóa khớp, lọc status/priority/deadline, quick filter theo tuần này, sort deadline và priority, và đánh dấu overdue nổi bật.
8. Thêm các chỉ báo tổng quan và số đếm phù hợp cho nhân viên: counts theo cột Kanban, số task quá hạn, countdown deadline, tab riêng cho cancelled tasks nếu backend/UX hỗ trợ xem phân tách, và widget thống kê task hoàn thành trong tuần trên dashboard nhân viên.
9. Cập nhật điều hướng, trạng thái trống, loading, và lỗi để phù hợp với UX task mới. Cần có đường dẫn từ dashboard sang task workspace, xử lý không có task, và giữ onboarding/profile/password flows không bị ảnh hưởng.
10. Viết hoặc cập nhật test frontend cho các luồng chính: render List/Kanban toggle, filter/search/sort, task drawer, status/progress update, checklist completion, attachment upload form, overdue display, and no regression on existing EmployeeHomePage onboarding behavior.

**Relevant files**
- `d:\Schools\QLDA\QLDA_Group10\frontend\src\App.tsx` — thêm route/task workspace và điều hướng cho nhân viên.
- `d:\Schools\QLDA\QLDA_Group10\frontend\src\components\layout\AppShell.tsx` — shell chung cho khu vực nhân viên, nơi đặt nav/task entry.
- `d:\Schools\QLDA\QLDA_Group10\frontend\src\pages\EmployeeHomePage.tsx` — giữ vai trò dashboard/onboarding, có thể thêm shortcut sang task workspace.
- `d:\Schools\QLDA\QLDA_Group10\frontend\src\lib\api.ts` — mở rộng client gọi task API hiện có.
- `d:\Schools\QLDA\QLDA_Group10\frontend\src\types\auth.ts` — tham chiếu kiểu session/role hiện tại khi phân quyền UI.
- `d:\Schools\QLDA\QLDA_Group10\app\api\tasks.py` — nguồn API contract để frontend bám theo.
- `d:\Schools\QLDA\QLDA_Group10\app\services\task_service.py` — logic business hiện có cho list/kanban/detail/checklist/status/progress/extension.
- `d:\Schools\QLDA\QLDA_Group10\app\schemas\task.py` — response shapes cho list, kanban, and filters.
- `d:\Schools\QLDA\QLDA_Group10\tests\test_tasks_crud.py` — xác nhận các endpoint backend mà frontend sẽ phụ thuộc.
- `d:\Schools\QLDA\QLDA_Group10\tests\test_tasks_unit.py` — kiểm tra grouping/kanban behavior để đối chiếu kỳ vọng UI.

**Verification**
1. Đối chiếu từng màn UI mới với endpoint backend tương ứng trước khi code để đảm bảo không tạo state/frontend feature không có API hỗ trợ.
2. Khi triển khai, chạy test frontend liên quan đến employee pages và task workspace mới, sau đó chạy test backend task tối thiểu để xác nhận hợp đồng dữ liệu vẫn đúng.
3. Kiểm tra thủ công các kịch bản: mở task workspace, chuyển list/kanban, search/filter/sort, mở drawer, update progress/status/checklist, và verify counts/overdue labels.
4. Chạy lint/typecheck frontend sau khi thêm types/API client mới để bắt lỗi response mapping sớm.

**Decisions**
- Phạm vi plan này chỉ bao gồm luồng nhân viên; các thao tác manager review/approve deadline extension chỉ được xem như phụ thuộc backend, không phải mục tiêu UI chính.
- Ưu tiên tái cấu trúc thành task workspace riêng thay vì mở rộng `EmployeeHomePage` thành một màn nặng, để giữ onboarding/dashboards tách biệt.
- Dùng backend task APIs hiện có làm nguồn chuẩn cho contract; chỉ đề xuất bổ sung frontend client/types, không yêu cầu thay đổi backend trừ khi khi triển khai phát hiện thiếu dữ liệu cho UI.

**Further Considerations**
1. Có nên gộp PB079, PB080, PB081 vào cùng một workspace với toggle view, hay tách riêng danh sách và kanban thành hai route? Khuyến nghị: cùng một workspace để chia sẻ filter/search/detail drawer.
2. Có nên hiển thị PB099 yêu cầu gia hạn trong drawer task hay là modal độc lập? Khuyến nghị: modal trong drawer để giảm chuyển ngữ cảnh.
