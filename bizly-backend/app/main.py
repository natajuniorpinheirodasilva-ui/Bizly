from fastapi import FastAPI

app = FastAPI(title="API HoraCerta")

@app.get("/")
def read_root():
    return {"mensagem": "API do HoraCerta rodando com sucesso!"}