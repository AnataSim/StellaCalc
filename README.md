# ⚡ StellaCalc — Stella Sora Combat & Damage Theorycrafter

<div align="center">

[ **English** ](#-english) • [ **简体中文** ](#-简体中文)

</div>

---

## 🌐 English

**StellaCalc** is an advanced damage computation engine and build theorycrafting simulator for **Stella Sora (ステラソラ)**. Designed for players and theorycrafters, it enables precise character build planning, team synergy optimization (1 Main Trekker + 2 Supports), accurate expected hit and Combat DPS calculations, and seamless preset management.

### 🧭 Project Directory Structure

All raw datamined game data, localized tables, and scripts are neatly consolidated inside the `database/` folder:

```text
StellaCalc/
├── database/                 # Datamined game databases & localization tables
│   ├── CN/, EN/, JP/, KR/, TW/ # Raw Unity game binary tables per locale
│   ├── hotfix/               # Game patch & hotfix analyzer
│   ├── character.json        # Character data, skill multipliers & talent trees
│   ├── disc.json             # Disc (Equipment / Memory) database
│   ├── emblem.json           # Emblem pools and tier stat attributes
│   ├── query.js              # High-speed CLI query engine for instant lookups
│   └── ...                   # Supporting parsers and dump scripts
├── web/                      # Web application source code (React + Vite + TailwindCSS)
│   ├── src/                  # UI components, DPS math, auth & security services
│   ├── public/               # Static web assets (icons, notes, emblems)
│   └── package.json          # Frontend dependencies
├── scripts/                  # Automated helper scripts
├── query.js                  # Root CLI proxy directing to database/query.js
├── firebase.json             # Firebase hosting configuration
├── firestore.rules           # Cloud Firestore security rules
└── README.md
```

### 🎮 Core Features

1. **Precision Combat DPS & Damage Engine**:
   * Evaluates Auto Attack, Main Skill, Support Skills, and Ultimate Burst based on:
     $$\text{Hit DMG} = \text{Scaling Stat} \times \text{Skill Multiplier} \times (1 + \text{Elem DMG}) \times (1 + \text{Skill Type Bonus}) \times (1 + \text{Vuln}) \times \text{Crit Multiplier}$$
   * Computes expected hit damage by weighing Critical Rate against Critical Damage.
   * Dynamically factors in cross-character synergy and passive stat buffs from Support 1 and Support 2.

2. **Interactive Breakdown Deep-Linking & Visual Highlighting (QoL)**:
   * Clicking any stat row in the **Combat Stats** or **Combat DPS** breakdowns instantly switches the active Trekker slot, unfolds the target accordion (Talent, specific Disc slot, Skill, or Emblem), smoothly scrolls to the section, and triggers a luminous **Amber Pulse Ring** highlighting the exact buff source.

3. **Embedded Build Presets Recall (No Obstructing Modals)**:
   * **18 Instant Preset Slots**: 6 Elements (Ignis, Aqua, Ventus, Terra, Lux, Umbra) × 3 Slots each.
   * Integrated directly within the main page underneath the Team Bar without screen-blocking overlays, allowing concurrent build adjustments and instant preset testing.
   * Interactive hover overlay: active slots offer **Save / Overwrite**, while inactive slots offer **Switch / Load**.

4. **Zero-Trust Client Security & Persistent Remember Me**:
   * **Salted IP Masking**: Raw IP addresses are never stored in plaintext or exposed over the wire; all network identifiers are one-way hashed with cryptographic salt (`sec_net_<hash>`).
   * **Hardware Fingerprint Auto-Login**: Multi-storage evercookie binding (`IndexedDB` + `localStorage`). Returning users automatically skip the login prompt even after prolonged offline periods.
   * **Anti-Tampering & Console Defense**: Critical session objects are frozen (`Object.freeze`) and console inspect protections guard against self-XSS attacks.

### 🛠️ Getting Started Locally

```bash
# 1. Run the Web App
cd web
npm install
npm run dev
npm run build

# 2. Use the Database Query CLI (from root)
node query.js character Amber
node query.js character "Firstlight Noya" --skills
node query.js disc "Crisp Morning"
```

### ⚖️ Credits, Hierarchical Database Takedown Rights & Disclaimer

* **Database Credit & Hierarchical Takedown Authority**:
  * This project utilizes extracted game data maintained by **[AutumnVN](https://github.com/AutumnVN)** at **[AutumnVN/ss-data](https://github.com/AutumnVN/ss-data)**.
  * **Hierarchical Takedown Notice**:
    > **The owner of the upstream database repository ([AutumnVN](https://github.com/AutumnVN)) holds full, hierarchical authority over all datamined files, data structures, and assets utilized in this project. Should the database owner at any time request the takedown, removal, or complete closure of the StellaCalc project, the StellaCalc maintainer ([AnataSim](https://github.com/AnataSim)) commits to unconditionally honoring and executing that request hierarchically.**
* **Game Copyright**:
  * All game assets, character designs, logos, and audio for **Stella Sora (ステラソラ)** are the intellectual property and copyright of **YOSTAR GAMES (悠星网络)**.
  * StellaCalc is a non-commercial, fan-made educational and theorycrafting utility.

---

## 🇨🇳 简体中文

**StellaCalc** 是专为 **星之翼 / 恒星群岛 (Stella Sora / ステラソラ)** 打造的高精度伤害计算引擎与配队数值模拟器。致力于为玩家与配队理论研究者提供主副角色协同（1 主战角色 + 2 支援协同）、伤害期望命中与实战 **Combat DPS** 计算，以及流畅的无缝配队预设管理体验。

### 🧭 项目目录结构

为保持代码库整洁与规范，所有解包游戏数据、多语言文本表与解析脚本已统一归类至 `database/` 目录中：

```text
StellaCalc/
├── database/                 # 解包游戏数据库与多语言文本表
│   ├── CN/, EN/, JP/, KR/, TW/ # 各语言版本的原始 Unity 二进制数据表
│   ├── hotfix/               # 补丁与热更分析工具
│   ├── character.json        # 角色基础属性、技能倍率与潜能天赋树
│   ├── disc.json             # 星盘 (Disc / Equipment / 记忆) 数据库
│   ├── emblem.json           # 徽章词条池与属性阶级数据
│   ├── query.js              # 毫秒级极速命令行查询引擎
│   └── ...                   # 其他数据解析与提取脚本
├── web/                      # 前端应用源码 (React + Vite + TailwindCSS)
│   ├── src/                  # UI 组件、伤害计算算法、安全与鉴权服务
│   ├── public/               # 前端静态资源 (图标、音符、徽章切图)
│   └── package.json          # 前端依赖配置
├── scripts/                  # 自动化辅助脚本
├── query.js                  # 根目录代理命令 (快速转发至 database/query.js)
├── firebase.json             # Firebase 云端部署配置文件
├── firestore.rules           # Cloud Firestore 安全规则
└── README.md
```

### 🎮 核心功能亮点

1. **精准 Combat DPS 伤害计算模型**:
   * 全面覆盖普攻 (Auto Attack)、主战技能 (Main Skill)、支援技能 (Support Skill) 与必杀奥义 (Ultimate Burst)：
     $$\text{单次伤害} = \text{基础倍率属性} \times \text{技能倍率} \times (1 + \text{属性伤害加成}) \times (1 + \text{技能类型加成}) \times (1 + \text{易伤加成}) \times \text{暴击倍率}$$
   * 综合暴击率与暴击伤害，自动计算单次期望伤害与秒伤数值。
   * 自动聚合 2 名支援角色对主战角色的属性转化、光环收益与共鸣加成。

2. **词条交互联动与智能高亮跳转 (QoL)**:
   * 点击 **Combat Stats** 或 **Combat DPS** 词条面板中的任意加成来源，页面将自动：
     1. 切换至对应角色槽位（主战、支援 1 或支援 2）；
     2. 自动展开对应子项（天赋潜能节点、指定星盘位、技能或徽章）；
     3. 平滑滚动并触发 **琥珀色光环脉冲 (Amber Pulse Ring)**，视觉化直观呈现属性来源。

3. **内嵌式预设存档管理 (拒绝全屏遮罩弹窗)**:
   * **18 个即时预设槽位**：6 大元素（炽火、流水、清风、大地、辉光、暗影）× 每个元素 3 个预设位。
   * 直接嵌于主页面队伍栏正下方，无任何阻碍交互的暗色遮罩层，实现“**主界面可实时调试，存档位可即时读写**”。
   * 悬停交互体验：已加载槽位悬停显示 **覆盖保存 (Save / Overwrite)**，其他槽位悬停显示 **快速切换 (Switch / Load)**。

4. **零信任安全架构与持久化免密自动登录**:
   * **IP 地址密码学盐值哈希**：客户端绝不以明文存储或向云端传输用户的真实公网 IP，所有网络标识均通过 SHA-256 加盐不可逆哈希编码（`sec_net_<hash>`）。
   * **硬件指纹持久化免密登录**：结合多层级持久存储（`IndexedDB` + `localStorage`），即使离线多日后重新访问，系统亦可自动识别设备并跳过登录页面直接载入数据。
   * **防篡改与控制台安全护盾**：核心会话对象均执行冻结防护（`Object.freeze`），并在 DevTools 控制台部署防 Self-XSS 恶意代码粘贴注入拦截。

### 🛠️ 本地运行与开发指南

```bash
# 1. 启动 Web 网页端
cd web
npm install
npm run dev
npm run build

# 2. 运行快速命令行数据查询 (在根目录下执行)
node query.js character Amber
node query.js character "Firstlight Noya" --skills
node query.js disc "Crisp Morning"
```

### ⚖️ 荣誉致谢、数据库所有者最高层级下架权声明与免责条款

* **数据库来源致谢与最高层级下架权声明**:
  * 本项目所采用的底层数据提取结构与数据库来源于 **[AutumnVN](https://github.com/AutumnVN)** 维护的开源项目 **[AutumnVN/ss-data](https://github.com/AutumnVN/ss-data)**。
  * **最高层级下架权保证声明**：
    > **上游数据仓库所有者（[AutumnVN](https://github.com/AutumnVN)）对本项目中使用的所有解包数据库、文件结构与游戏衍生数据拥有最高层级的全权支配权与最终解释权。若数据原作者在任何时间提出要求下架、删除或关停 StellaCalc 项目的指令，StellaCalc 项目维护者（[AnataSim](https://github.com/AnataSim)）郑重承诺将无条件、全流程严格遵循层级指令下架并清理相关公开仓库与内容。**
* **游戏官方版权声明**:
  * **星之翼 / 恒星群岛 (Stella Sora / ステラソラ)** 的所有游戏原始资源、立绘、音频、角色名称、标识及知识产权归 **YOSTAR GAMES (悠星网络)** 及其合法持有者所有。
  * 本项目仅供技术学习、数据分析与非商业性玩家数值理论参考，不承担任何衍生使用责任。
