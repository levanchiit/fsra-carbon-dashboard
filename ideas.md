# Ý tưởng thiết kế — FSRA Carbon & DSCR Dashboard

## Ba hướng thẩm mỹ

### 1. Phòng phân tích khí hậu

**Theme Name:** Climate Risk Lab

**Very Brief Intro:** Một không gian phân tích tài chính giống bàn làm việc của chuyên viên rủi ro: nền giấy ấm, mực xanh đậm, các dải dữ liệu màu carbon và xanh khoáng. Giao diện tạo cảm giác đáng tin, kỹ thuật nhưng không lạnh lẽo.

**Probability:** 0.037

### 2. Trạm kiểm soát công nghiệp

**Theme Name:** Industrial Control Deck

**Very Brief Intro:** Bố cục tối, tương phản cao, lấy cảm hứng từ bảng điều khiển nhà máy và tín hiệu cảnh báo. Phù hợp vận hành nhưng dễ khiến sản phẩm giống dashboard kỹ thuật phổ thông.

**Probability:** 0.061

### 3. Bản đồ quy định

**Theme Name:** Regulatory Cartography

**Very Brief Intro:** Thiết kế biên tập với đường kẻ, chú giải, lớp dữ liệu và màu sắc như bản đồ chính sách. Hướng này giàu cá tính nhưng kém trực quan hơn cho thao tác tải tệp thường xuyên.

**Probability:** 0.024

## Hướng được chọn: Climate Risk Lab

### Design Movement

Thiết kế theo phong cách **Swiss editorial analytics kết hợp sustainable-finance materiality**: cấu trúc rõ, typography có nhịp điệu, bề mặt giấy và lớp dữ liệu được tổ chức như một phòng phân tích chuyên nghiệp.

### Core Principles

1. **Evidence before decoration:** mọi chi tiết thị giác phải giúp đọc dữ liệu, trạng thái kiểm tra hoặc công thức.
2. **Asymmetric workspace:** sidebar hẹp như gáy hồ sơ; vùng tải tệp và kết quả chia theo tỉ lệ không cân xứng để tạo nhịp điệu.
3. **Measured contrast:** xanh than cho cấu trúc, xanh khoáng cho trạng thái tốt, hổ phách cho cảnh báo và đỏ gạch cho breach.
4. **Progressive disclosure:** màn hình đầu tập trung vào tải tệp; các bảng chi tiết chỉ xuất hiện sau khi có kết quả.

### Color Philosophy

Nền chính là **Warm Ledger** — trắng ngà hơi xám để giảm cảm giác chói và gợi chất liệu tài liệu phân tích. Màu thương hiệu **Carbon Teal** đại diện cho giao điểm giữa carbon accounting và green credit. Navy tạo uy tín định lượng, hổ phách biểu đạt giả định cần xem xét, còn đỏ gạch chỉ dành cho trạng thái breach/default để không gây báo động giả.

### Layout Paradigm

Giao diện dùng **workbench layout**: sidebar dọc cố định bên trái; header mảnh phía trên; khối upload lớn nằm lệch trái; khối “formula trace” hẹp ở bên phải. Sau khi tải tệp, khu KPI kéo ngang, tiếp đến là đường DSCR theo năm và bảng waterfall liability theo cấu trúc 7/5 thay vì lưới đối xứng.

### Signature Elements

1. **Carbon ribbon:** đường dải mảnh chạy xuyên các panel, chuyển từ teal sang amber/brick theo mức độ rủi ro.
2. **Formula tags:** các nhãn monospace nhỏ như `CFADSₜ`, `αCBAM`, `ηpass-through` đặt cạnh chỉ tiêu để tạo dấu ấn định lượng.
3. **Ledger ticks:** các vạch số và đường rule mảnh ở mép card, gợi bảng tính và hồ sơ audit.

### Interaction Philosophy

Tương tác phải chắc chắn và tức thì: dropzone phản hồi bằng đường viền teal và thay đổi microcopy; kiểm tra dữ liệu hiển thị theo từng bước; lỗi chỉ ra tên trường và cách sửa; mỗi KPI có tooltip truy vết về công thức. Các nút chính có độ nén khi nhấn và mọi thông báo dùng ngôn ngữ trung tính, không phán quyết quá mức.

### Animation

Chuyển động dưới 260ms với easing `cubic-bezier(0.23, 1, 0.32, 1)`. Upload state trượt lên 8px kết hợp opacity; KPI xuất hiện theo stagger 45ms; biểu đồ dùng stroke reveal nhẹ. Không dùng chuyển động lặp vô hạn ngoài spinner lúc đọc tệp. Với `prefers-reduced-motion`, bỏ toàn bộ reveal không thiết yếu.

### Typography System

**Manrope** dùng cho headline và số KPI nhờ hình học rõ nhưng mềm; **IBM Plex Sans** dùng cho body và bảng dữ liệu; **IBM Plex Mono** dùng cho formula tags, tên biến và trạng thái kiểm tra. H1 42–52px, weight 700; section title 22–28px; KPI 30–38px; body 14–16px; annotation 11–12px uppercase có letter-spacing vừa phải.

### Brand Essence

**FSRA Compass biến dữ liệu phát thải và dòng tiền thành tín hiệu covenant có thể kiểm chứng cho nhóm phân tích tín dụng.** Tính cách: **kỷ luật, minh bạch, điềm tĩnh**.

### Brand Voice

Headline ngắn, có động từ và nói rõ quyết định; CTA mô tả đúng thao tác; microcopy ưu tiên hướng dẫn sửa lỗi hơn là đổ lỗi cho người dùng.

Ví dụ: **“Từ phát thải đến covenant, không bỏ sót một bước.”**

Ví dụ: **“Thả dữ liệu. Kiểm tra giả định. Đọc tín hiệu DSCR.”**

### Wordmark & Logo

Logo là một **la bàn bốn hướng được tạo bởi hai dải carbon giao nhau**, tâm là chấm dữ liệu; hình thể vuông bo nhẹ nhưng không dùng khung tròn phổ thông. Wordmark ghép “FSRA” bằng Manrope ExtraBold với chữ A được cắt theo góc la bàn; phần “Compass” dùng IBM Plex Sans Medium.

### Signature Brand Color

**Carbon Teal — `oklch(0.49 0.105 181)`**, đủ khác biệt với xanh ngân hàng phổ thông và kết nối trực tiếp với chủ đề chuyển dịch carbon.

## Style Decisions

1. **Brand lockup rule:** Mọi màn hình chính phải hiển thị mark la bàn–carbon ribbon cùng wordmark “FSRA Compass”, không chỉ tên chức năng Carbon & DSCR.
2. **Hero imagery rule:** Hero được xử lý như một analytical artifact với ledger rules, formula tags, covenant markers và audit traces; giảm cảm giác cinematic dashboard wallpaper.
3. **Carbon ribbon rule:** Dải teal → amber → brick là tín hiệu risk-path xuyên suốt upload, công thức, KPI, biểu đồ và validation.
4. **Simulation surface rule:** Control panel Monte Carlo dùng nền navy như bàn điều khiển chuyên viên; histogram và heatmap vẫn đặt trên warm ledger để giữ khả năng đọc. Màu teal–amber–brick chỉ mã hóa mức breach risk, không dùng trang trí tùy ý.
