# 배포 가이드 — VPS 상시 실행 (부부가 어디서든 접속)

집 밖에서도 부부가 각자 접속해 쓰고 싶을 때의 방법입니다. SQLite를 그대로 쓸 수 있어
코드 변경이 필요 없습니다(SQLite는 Vercel 같은 서버리스에서는 동작하지 않습니다 — README 참고).

전체 흐름: **VPS 하나 → Node.js·저장소 설치 → 상시 실행 → 도메인 연결 → HTTPS**

---

## 1. VPS 준비

### 추천: Oracle Cloud Always Free

영구 무료 티어입니다. 2026년 6월부터 스펙이 줄었지만 이 앱엔 충분합니다.

| 항목 | 사양 |
|---|---|
| Ampere A1 (ARM) | **2 OCPU · 12GB RAM** (2026-06 이전엔 4 OCPU·24GB였습니다) |
| 또는 E2.1.Micro (AMD) | 1/8 OCPU · 1GB RAM, 최대 2대 |

가입 → Compute → Create Instance → **Ampere (VM.Standard.A1.Flex)** 선택 →
Ubuntu 24.04 이미지 → SSH 키 생성(다운로드해 보관) → 생성.

> 신용카드 등록이 필요하지만 Always Free 한도 안에서는 과금되지 않습니다.
> 대안: [AWS Lightsail](https://aws.amazon.com/lightsail/)(월 $5부터, 설정이 더 간단), 국내 VPS(가비아·카페24 등).

### 방화벽(보안 목록) 열기

Oracle Cloud 콘솔 → VCN → Security List에서 **80, 443 포트를 0.0.0.0/0으로 인바운드 허용**하세요.
3000(앱 포트)은 **열지 않습니다** — 뒤에서 Caddy가 안쪽에서만 연결합니다.

---

## 2. 서버 초기 설정

```bash
ssh -i ~/.ssh/oracle-key.pem ubuntu@<서버_IP>

sudo apt update && sudo apt upgrade -y

# 방화벽 (서버 안쪽에서도 한 번 더)
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### Node.js 설치

앱이 요구하는 버전(`^20.19 || ^22.12 || >=24`)에 맞춰 22 LTS를 넣습니다.

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git
node -v   # v22.x 확인
```

---

## 3. 앱 설치

```bash
cd /opt
sudo git clone https://github.com/PassionTree/Real_Estate_Tracker.git
sudo chown -R $USER:$USER Real_Estate_Tracker
cd Real_Estate_Tracker

npm install                 # postinstall 이 Prisma 클라이언트까지 생성합니다
cp .env.example .env
```

`.env`를 열어 채웁니다.

```
SHARED_PASSWORD=원하는_비밀번호
SESSION_SECRET=            # openssl rand -hex 32 로 생성
USERS=남편,아내
DATABASE_URL="file:./dev.db"
MOLIT_API_KEY=             # 있다면
```

```bash
npx prisma migrate deploy
npm run db:seed
npm run build
```

`npm run build`가 통과하는지 여기서 먼저 확인하세요. (`npm run dev`가 아니라 `npm run build && npm start`로 운영합니다 — 프로덕션 빌드가 훨씬 가볍고 안정적입니다.)

---

## 4. 상시 실행 — systemd

터미널을 닫아도 계속 돌아야 하고, 서버가 재부팅돼도 자동으로 다시 뜨는 게 중요합니다.
`pm2` 같은 별도 패키지 없이 리눅스 기본 도구(systemd)로 충분합니다.

```bash
sudo tee /etc/systemd/system/realestate.service > /dev/null <<'EOF'
[Unit]
Description=Real Estate Tracker
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/Real_Estate_Tracker
Environment=PORT=3000
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now realestate
sudo systemctl status realestate   # active (running) 확인
```

**로그 보기**: `journalctl -u realestate -f`
**재시작**: `sudo systemctl restart realestate`

---

## 5. 도메인 연결

도메인이 있다면(없으면 무료 서브도메인 서비스로 [DuckDNS](https://www.duckdns.org/) 등을 쓸 수 있습니다):

가비아·Cloudflare 등 DNS 관리 화면에서 **A 레코드**를 추가합니다.

```
타입: A
호스트: home (예: home.mydomain.com 이 됩니다)
값: <서버_IP>
```

전파에 몇 분~몇 시간 걸릴 수 있습니다. `ping home.mydomain.com`으로 서버 IP가 나오면 완료.

---

## 6. HTTPS — Caddy

**HTTPS는 선택이 아니라 필수입니다.** 지금 인증은 비밀번호 하나뿐이고, HTTP로 열면
그 비밀번호가 평문으로 오갑니다. Caddy는 Let's Encrypt 인증서를 **자동으로** 발급·갱신해 줘서
직접 만질 일이 거의 없습니다.

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

`/etc/caddy/Caddyfile`을 이렇게 씁니다 (도메인만 실제 값으로 바꾸세요):

```
home.mydomain.com {
    reverse_proxy localhost:3000
}
```

```bash
sudo systemctl restart caddy
```

이제 `https://home.mydomain.com`으로 접속하면 자물쇠 아이콘과 함께 앱이 뜹니다.
Caddy가 인증서 발급·HTTP→HTTPS 리다이렉트·갱신을 전부 알아서 합니다.

---

## 7. 백업 — 원격 서버라 더 중요합니다

로컬 PC와 달리, 이 서버가 통째로 사라지면(계정 정지, 실수로 인스턴스 삭제 등) **복구할 방법이 없습니다.**

```bash
crontab -e
```

매일 새벽 3시에 백업을 만들고, **서버 밖으로도** 복사합니다.

```cron
0 3 * * * cd /opt/Real_Estate_Tracker && npm run backup
```

`npm run backup`은 서버 안(`backups/`)에만 쌓입니다. 정말 안전하려면 그중 하나를
가끔 로컬로 내려받으세요.

```bash
# 로컬 PC에서
scp -i ~/.ssh/oracle-key.pem -r ubuntu@<서버_IP>:/opt/Real_Estate_Tracker/backups/최신폴더 ./
```

---

## 8. 업데이트할 때

새 기능이 머지되면 서버에서:

```bash
cd /opt/Real_Estate_Tracker
git pull origin main
npm install
npx prisma migrate deploy
npm run build
sudo systemctl restart realestate
```

---

## 요약 체크리스트

- [ ] VPS 생성, 80·443만 방화벽 허용
- [ ] Node 22 설치
- [ ] 저장소 clone → `.env` 작성 → `migrate deploy` → `db:seed` → `build`
- [ ] systemd 서비스 등록 (재부팅에도 살아남게)
- [ ] 도메인 A 레코드 연결
- [ ] Caddy로 HTTPS (필수)
- [ ] cron 백업 등록 + 가끔 로컬로 내려받기
