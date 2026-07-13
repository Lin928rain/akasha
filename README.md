# Akasha

![Akasha](https://github.com/h16nning/akasha/assets/48356881/fa7e08d5-af5d-4d5a-bd1c-3dafb68cc033)

这是一个早期项目，目标是打造一款基于网页的间隔重复闪卡应用，类似 Anki。可在这里查看演示：[akasha.cards](https://akasha.cards)。

#### 项目当前状态
- 普通 / 双面卡片和填空题（cloze）卡片
- 富文本内容（HTML）
- 基于 fsrs.js 的学习算法（自由间隔重复调度器的实现）
- 卡片管理工具（仍有改进空间）
- 浅色 / 深色 / 跟随系统模式

#### 尚未实现的功能
- 图片遮挡（image occlusion）
- 音频
- 今日视图
- 统计
- Spotlight 式搜索
- 离线缓存

#### 目标
- 开源且免费
- 用户友好、直观的界面
- 有趣且能激励学习的使用体验
- 针对移动端和桌面端优化的响应式设计
- 通过 Supabase（Postgres）实现单用户、多设备同步
- PWA 和离线缓存（可能会使用 Notification API）
- 可自定义

#### 技术栈
- TypeScript
- React
- Mantine React
- Supabase（Postgres）用于数据存储

#### 本地开发（Supabase）
1) 安装 Docker 和 Supabase CLI。
2) 在项目根目录下运行：
   ```bash
   supabase start
   ```
3) 将 `.env.example` 复制为 `.env`，并根据 `supabase status` 显示的地址填写 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`。
4) 应用数据库迁移：
   ```bash
   supabase db reset
   ```
5) 启动应用：
   ```bash
   npm start
   ```

#### 导入已有数据（可选）
如果你从应用中导出了 JSON 数据，可以用以下命令导入：
```bash
node scripts/import-supabase.mjs path/to/export.json --overwrite
```
运行前请在 `.env` 中设置 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`。

#### 安全提示
`supabase/migrations/0002_rls_policies.sql` 中的默认 RLS 策略对 `anon` 角色开放了完整访问权限（方便单人开发/使用）。在将实例暴露到公网之前，请先收紧这些策略。

#### 项目动机
许多学生和其他学习者都在使用间隔重复工具，其中主要是 Anki。Anki 非常实用，但整体界面往往不够直观，也无法很好地激励用户学习。其他替代方案要么收费，要么是闭源软件。
如果你对此感兴趣，非常欢迎为这个项目做出贡献。如果有任何问题或建议，请随时创建 issue 或开启 discussion。

<img width="627" alt="Bildschirmfoto 2024-02-21 um 02 30 53" src="https://github.com/h16nning/akasha/assets/48356881/774fa6fb-0f1c-4d60-8134-4af7cf2c4510">
<img width="916" alt="Bildschirmfoto 2024-02-21 um 02 30 28" src="https://github.com/h16nning/akasha/assets/48356881/ddc6380f-2354-4dda-9928-4ae7cd924b1c">
<img width="612" alt="Bildschirmfoto 2024-02-21 um 02 30 03" src="https://github.com/h16nning/akasha/assets/48356881/bccd9367-381f-4bf2-9052-1b56ed0aca76">
