import requests

API_URL = "http://localhost:8000"


def test_ingest(file_path):
    print(f"Uploading {file_path}...")
    url = f"{API_URL}/rag/ingest"

    with open(file_path, "rb") as f:
        files = {"file": f}
        response = requests.post(url, files=files)

    if response.status_code == 200:
        print("✅ Ingest Success:", response.json())
    else:
        print("❌ Ingest Failed:", response.text)


def test_query(question):
    print(f"\nAsking: {question}")
    url = f"{API_URL}/rag/query"

    payload = {
        "query": question,
        "limit": 3
    }

    response = requests.post(url, json=payload)

    if response.status_code == 200:
        data = response.json()
        print("\n🤖 Answer:", data["answer"])
        print("\n📄 Sources:")
        for source in data["sources"]:
            print(f" - {source['filename']} (Score: {source['score']:.2f})")
    else:
        print("❌ Query Failed:", response.text)


if __name__ == "__main__":
    # 1. create a dummy file to test
    with open("test_doc.txt", "w") as f:
        f.write(
            "Co-Op is a platform connecting startups with investors. It was founded in 2024.")

    # 2. Run tests
    test_ingest("test_doc.txt")
    test_query("When was Co-Op founded?")
