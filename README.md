# Cross-Border SMS Hub

新建一个项目，项目名称“短信营销管理系统”，面向客户群为有短信营销需求的跨境电商从业者，系统整体风格请你根据我的客户群来设计，系统功能包括：1. 目标管理：支持新增、批量导入和管理目标【目标字段包括：姓名、手机号、国家/地区】

2. 任务管理：新建任务【任务字段：任务名称（系统自动生成，可手动修改）、目标（选择）、发信内容（选择模板】，发信内容支持预览

3. 短信明细：列表展示列分别为目标、状态、发送内容、积分、创建时间、成功时间、失败原因、是否回复（是时，鼠标hover展示对方回复内容），操作（对方有回复时展示 回复操作按钮）

4. 短信模板：支持新建、编辑、删除短信模板，支持参数变量设置（联系人、我方产品、官网链接、其他链接等）

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://crossborder-smartsender.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/def05691-cf41-4192-af3f-68766502052d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
