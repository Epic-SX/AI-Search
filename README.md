# AI商品検索システム

AIを活用した商品検索システムです。商品型番から類似商品を検索したり、画像から類似商品を検索したりすることができます。

## 機能

- **単一検索**: 商品型番から類似商品を検索
- **一括検索**: 複数の商品型番を一括で検索
- **画像検索**: 画像から類似商品を検索
- **商品比較**: 複数の商品を比較

## 技術スタック

### バックエンド

- Python 3.9+
- Flask
- Perplexity API
- Google Cloud Vision API
- 各種ECサイトAPI (Amazon, Rakuten, Yahoo, Kakaku.com)

### フロントエンド

- Next.js
- TypeScript
- Material UI

## セットアップ

### 環境変数

バックエンドの `.env` ファイルに以下の環境変数を設定してください：

```
FLASK_APP=app.py
FLASK_ENV=development
PERPLEXITY_API_KEY=your_perplexity_api_key
AMAZON_PARTNER_TAG=your_amazon_partner_tag
AMAZON_ACCESS_KEY=your_amazon_access_key
AMAZON_SECRET_KEY=your_amazon_secret_key
GOOGLE_CLOUD_API_KEY=your_google_cloud_api_key
RAKUTEN_APP_ID=your_rakuten_app_id
RAKUTEN_APP_SECRET=your_rakuten_app_secret
RAKUTEN_AFFILIATE_ID=your_rakuten_affiliate_id
YAHOO_CLIENT_ID=your_yahoo_client_id
KAKAKU_SHOP_CD=your_kakaku_shop_cd
KAKAKU_API_KEY=your_kakaku_api_key
KAKAKU_OAUTH_SECRET=your_kakaku_oauth_secret
```

フロントエンドの `.env.local` ファイルに以下の環境変数を設定してください：

```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### バックエンドのセットアップ

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windowsの場合: venv\Scripts\activate
pip install -r requirements.txt
flask run
```

### フロントエンドのセットアップ

```bash
cd frontend
npm install
npm run dev
```

## 使い方

### 単一検索

1. トップページから「単一検索」を選択
2. 商品型番を入力して検索
3. 検索結果から最適な商品を選択

### 一括検索

1. トップページから「一括検索」を選択
2. 複数の商品型番を入力するか、CSVファイルをアップロード
3. 検索結果から最適な商品を選択

### 画像検索

1. トップページから「画像検索」を選択
2. 画像をアップロードするか、画像URLを入力
3. 検索結果から類似商品を選択

### 商品比較

1. トップページから「商品比較」を選択
2. 比較したい商品の情報を入力
3. 比較結果を確認

## ライセンス

このプロジェクトは非公開です。無断での使用、複製、配布は禁止されています。 