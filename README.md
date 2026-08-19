# Vietnamese Summarizer / Tóm tắt tiếng Việt

## Tổng quan / Overview

Vietnamese Summarizer là một prototype frontend React + Vite được xây dựng để hỗ trợ tóm tắt văn bản song ngữ bằng tiếng Việt và tiếng Anh. Dự án tập trung vào trải nghiệm người dùng hiện đại, tối giản và thân thiện, cho phép nhập văn bản thủ công, tải lên tệp, xem bản tóm tắt, quản lý lịch sử, và trải nghiệm các luồng đăng nhập, hồ sơ cá nhân, pricing và dashboard.

Vietnamese Summarizer is a React + Vite frontend prototype built to support bilingual text summarization in Vietnamese and English. The project focuses on a modern, minimal, and user-friendly experience where users can paste text, upload files, review summaries, manage history, and interact with login, profile, pricing, and dashboard flows.

---

## Trạng thái dự án / Project status

### Tiếng Việt
- Frontend prototype đã được hoàn thiện ở mức UI và có thể chạy với Vite.
- Giao diện hiện có bao gồm khu vực nhập / tóm tắt, upload file, chuyển đổi ngôn ngữ, layout chung, overlay lịch sử và bookmark, các trang auth, profile, pricing, và dashboard.
- Logic tóm tắt hiện vẫn chủ yếu là mock ở frontend và chưa kết nối hoàn toàn với backend thực tế.
- Các trang đăng nhập / đăng ký / reset mật khẩu / xác minh email mới ở mức giao diện và logic client-side.

### English
- The frontend prototype is implemented and can run with Vite.
- The current UI includes input/summarization areas, file upload flow, language switching, shared layout, history and bookmarks overlays, auth pages, profile, pricing, and dashboard views.
- The summarization logic remains mostly front-end mock behavior and is not yet fully connected to a production backend.
- Login, signup, reset password, and email verification flows are UI-first and client-side only.

---

## Tính năng chính / Main features

### Tiếng Việt
- Nhập văn bản thủ công và dán nội dung để tóm tắt
- Tải lên tệp tài liệu để trích xuất nội dung
- Chọn độ dài bản tóm tắt: ngắn / trung bình / dài
- Hiển thị kết quả tóm tắt với các nút sao chép, tải xuống và đọc giọng nói
- Phản hồi bằng nút thích / không thích
- Chuyển đổi giao diện song ngữ Anh – Việt
- Overlay lịch sử và bookmark
- Trang đăng nhập, đăng ký, đặt lại mật khẩu, xác minh email
- Trang hồ sơ cá nhân và kiểm tra mật khẩu
- Trang pricing với nhiều gói đăng ký
- Dashboard admin và kiểm tra quyền truy cập

### English
- Manual text input and paste-to-summarize workflow
- File upload support for extracting content from documents
- Summary length selection: short / medium / long
- Result panel with copy, download, and text-to-speech actions
- Feedback using thumbs up / thumbs down controls
- English and Vietnamese interface switching
- History and bookmark overlays
- Login, signup, reset password, and email verification pages
- Profile management page with password validation
- Pricing page with multiple subscription tiers
- Admin dashboard and access-control patterns

---

## Yêu cầu giao diện / UI Requirements Specification

### Tiếng Việt
#### 1. Mục tiêu sản phẩm
Giao diện cần tạo cảm giác là một công cụ tóm tắt văn bản hiện đại, đáng tin cậy, phù hợp cho người dùng tiếng Việt và tiếng Anh. UI phải giúp người dùng nhanh chóng đi từ nhập liệu đến kết quả mà không gặp rào cản.

#### 2. Trải nghiệm cốt lõi
- Người dùng phải dễ dàng dán văn bản hoặc tải file lên.
- Người dùng nên hiểu ngay cách chọn chế độ tóm tắt và độ dài tóm tắt.
- Kết quả tóm tắt phải dễ đọc, dễ quét và có không gian rõ ràng.
- Các hành động như sao chép, tải xuống và phản hồi phải hiển thị rõ và dễ nhìn.

#### 3. Bố cục và điều hướng
- Bố cục tổng thể nên ưu tiên nội dung và sự rõ ràng hơn là trang trí quá mức.
- Header cần gọn, hiện đại và chứa các link quan trọng.
- Các hành động quan trọng như Summarize, Copy, Download, Login/Signup phải nổi bật.
- Ở màn hình mobile, nội dung phải sắp xếp dọc và vẫn dễ sử dụng.

#### 4. Chế độ giao diện và phong cách trực quan
- Ứng dụng cần hỗ trợ cả theme sáng và tối.
- Chuyển đổi theme nên dùng toggle theo class thay vì chỉ dựa vào cài đặt hệ thống.
- Theme sáng phải có độ tương phản chữ mạnh, đặc biệt cho tiêu đề và nhãn UI quan trọng.
- Theme tối nên có lớp nền phân cấp rõ ràng và màu chữ dễ đọc.
- Màu nhấn phải nhất quán trên toàn ứng dụng cho nút CTA, focus state và trạng thái quan trọng.

#### 5. Typography và màu sắc
- Phông chữ phải sạch, rõ và nhất quán trên các trang.
- Tiêu đề chính nên đậm và có độ tương phản cao trong sáng mode.
- Văn bản body cần dễ đọc ở cả hai theme.
- Nút bấm, liên kết và trạng thái cảnh báo phải có hover/focus rõ ràng.
- Tránh dùng phối màu xám nhạt trên nền xám trong theme sáng.

#### 6. Yêu cầu auth
- Màn hình đăng nhập và đăng ký phải sạch, gọn và căn giữa.
- Form phải hiển thị lỗi validation ngay dưới trường tương ứng.
- Nên có chức năng hiển thị/ẩn mật khẩu khi cần thiết.
- Luồng xác thực phải đơn giản, nhất quán và phù hợp với chính sách sản phẩm.
- Nếu chỉ dùng email/password thì các nút social login có thể bị loại bỏ.

#### 7. Dashboard và trang hồ sơ
- Dashboard cần có các block dễ đọc, rõ ràng và có bố cục gọn.
- Trang hồ sơ cần cho phép cập nhật thông tin và đổi mật khẩu với thông báo validation rõ.
- Nút lưu và hủy cần dễ nhận diện và có trạng thái xác nhận rõ ràng.

#### 8. Pricing và chuyển đổi người dùng
- Card pricing cần dễ so sánh giá trị giữa các gói.
- Gói được khuyến nghị nên được nhấn mạnh trực quan.
- Nút CTA phải thể hiện rõ mục đích và dễ thấy.

#### 9. Khả năng tiếp cận và khả năng sử dụng
- Nút bấm cần đủ lớn và dễ chạm trên mobile.
- Độ tương phản chữ phải đạt tiêu chuẩn dễ đọc ở cả hai theme.
- Thông báo lỗi phải rõ ràng và dễ hiểu.
- Trạng thái loading phải cho biết hệ thống đang xử lý.

#### 10. Responsive behavior
- Ứng dụng phải hoạt động tốt trên desktop, tablet và mobile.
- Khu vực tóm tắt phải dễ sử dụng trên màn hình hẹp.
- Các control quan trọng cần wrap hoặc sắp xếp lại hợp lý khi không gian bị hạn chế.

### English
#### 1. Product goal
The interface should feel like a modern, trustworthy summarization tool for Vietnamese and English users. It should help users move quickly from input to output without friction.

#### 2. Core experience
- Users should be able to paste text or upload a file easily.
- Users should immediately understand how to choose a mode and summary length.
- Output should be readable, structured, and easy to review.
- Core actions such as copy, download, and feedback should be obvious and easy to use.

#### 3. Layout and navigation
- The overall layout should prioritize content clarity over decorative clutter.
- The header should remain compact and modern while containing the key sections.
- Primary actions like Summarize, Copy, Download, and Login/Signup should stand out clearly.
- On smaller screens, the layout should stack vertically and remain easy to use.

#### 4. Theme and visual style
- The application should support both light and dark themes.
- Theme switching should be controlled by a class-based toggle rather than only system preferences.
- Light mode must keep strong text contrast, especially in headings and important labels.
- Dark mode should maintain readable contrast and layered backgrounds.
- Accent colors should remain consistent across CTAs, hover states, and focus states.

#### 5. Typography and color
- Typography should be clean, readable, and consistent throughout the app.
- Main titles should be bold and have strong contrast in light mode.
- Body text must remain legible in both themes.
- Buttons, links, and warning states should have clear hover and focus states.
- Avoid weak gray-on-gray combinations in light mode.

#### 6. Auth requirements
- Login and signup screens should be clean, centered, and uncluttered.
- Validation errors should appear directly under the relevant field.
- Password toggle visibility should be available when needed.
- The auth flow should remain simple and aligned with product strategy.
- Social login options may be removed if the project is intentionally email/password-only.

#### 7. Dashboard and profile
- Dashboard blocks should be easy to scan and visually balanced.
- Profile pages should support account editing and password changes with visible validation.
- Save and cancel actions should be clearly distinguished and easy to understand.

#### 8. Pricing and conversion
- Pricing cards should make value comparison easy.
- Recommended plans should be visually emphasized.
- CTA buttons should be obvious and highly readable.

#### 9. Accessibility and usability
- Interactive elements must be large enough for touch use.
- Text contrast should meet accessibility standards in both themes.
- Error messages should be direct and friendly.
- Loading states should clearly communicate that work is in progress.

#### 10. Responsive behavior
- The app should work well on desktop, tablet, and mobile screens.
- The summarizer experience must remain usable on narrow screens.
- Important controls should wrap or reorganize cleanly when space is limited.

---

## Cấu trúc project / Project structure

```text
frontend/
  src/
    App.jsx
    components/
    context/
    hooks/
    i18n/
    pages/
    utils/
  package.json
  vite.config.js
```

---

## File quan trọng / Key files

- `frontend/src/App.jsx` — cấu hình route và theme provider / main route setup and theme provider
- `frontend/src/pages/HomePage.jsx` — giao diện tóm tắt chính / main summarizer page
- `frontend/src/pages/LoginPage.jsx` — trang đăng nhập / login page
- `frontend/src/pages/SignupPage.jsx` — trang đăng ký / signup page
- `frontend/src/pages/ProfilePage.jsx` — trang hồ sơ người dùng / profile page
- `frontend/src/pages/PricingPage.jsx` — trang pricing / pricing page
- `frontend/src/pages/DashboardPage.jsx` — dashboard admin / admin dashboard
- `frontend/src/components/Layout.jsx` — header và navigation chung / shared header and navigation
- `frontend/src/i18n/translations.js` — chuỗi dịch tiếng Anh và tiếng Việt / bilingual strings
- `frontend/src/utils/api.js` — helper cho API / API helper layer

---

## Thiết lập / Setup

### Yêu cầu môi trường / Prerequisites
- Node.js 18+ khuyến nghị / Node.js 18+ recommended

### Cài đặt / Install

```bash
cd frontend
npm install
```

---

## Chạy local / Run locally

```bash
npm run dev
```

Mở URL hiển thị bởi Vite, thường là `http://localhost:5173`.

Open the local URL shown by Vite, usually `http://localhost:5173`.

---

## Build production / Build cho production

```bash
npm run build
```

Preview bản build local:

Preview the production build locally:

```bash
npm run preview
```

---

## Ghi chú phát triển / Development notes

### Tiếng Việt
- Dự án hiện đã ở mức prototype frontend khá hoàn chỉnh với trải nghiệm tương tác rõ ràng.
- Backend tóm tắt thực tế chưa được tích hợp hoàn toàn theo chuẩn production.
- Có thể tiếp tục mở rộng bằng cách kết nối API tóm tắt thật và lưu lịch sử lên server.
- Nhiều chuỗi text đã được chuẩn bị để hỗ trợ đa ngôn ngữ thông qua file dịch thuật.

### English
- The project is already at a mature frontend prototype stage with polished interaction patterns.
- The real summarization backend is not yet fully integrated in a production-ready way.
- It can be extended by connecting real summarization APIs and persisting history on a server.
- Many text strings are already prepared for bilingual support through the translation file.

---

## Lưu ý cuối / Final note

Dự án này đã có cấu trúc và giao diện đủ mạnh để trở thành một sản phẩm tóm tắt tiếng Việt thực tế, và còn rất phù hợp để tiếp tục tích hợp backend, tối ưu hóa UX và hoàn thiện các yếu tố nâng cao như theme, accessibility và responsive behavior.

This project already has a solid frontend structure and interface foundation to become a real Vietnamese summarization product, and it is well suited for further backend integration, UX optimization, and refinement of theme, accessibility, and responsive behavior.
