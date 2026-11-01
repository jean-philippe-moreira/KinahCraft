# KinahCraft

Mostra o preço unitário, o total de cada material e o total geral de um craft no servidor escolhido.

## Como usar

Precisa do Node 20 ou mais novo.

```bash
npm start
```

1. Abra <http://localhost:3000>.
2. Na [calculadora do gamers4.life](https://gamers4.life/aion-2/database/en/crafting-calculator/), escolha o item e clique em **Copy list**.
3. Cole a lista na aplicação, escolha a facção e o servidor e clique em **Calcular**. O nome do item é opcional e mostra a imagem dele no topo.

O servidor reinicia sozinho quando o código muda.

## Como ler o resultado

- **Tenho**: o que você já tem sai do total daquele material e do custo de compra.
- **Preço unit.**: oferta mais barata no momento. Se não houver ofertas, usa o último preço e marca a linha.
- **Ofertas**: quantidade de anúncios. Para quantidades grandes, o preço real tende a subir, porque a oferta mais barata não cobre tudo.
- **Média**: média das vendas recentes informada pelo aion2.exchange.
- **Sem preço**: itens que o mercado não lista, como os `(Bound)`. Eles ficam fora do total.
- O total de itens Splendent considera os crafts esperados com a chance de 25%, conforme a calculadora. Não desconta a venda dos itens comuns gerados nas tentativas.

## Dados

- A lista é colada por você. A aplicação não acessa o gamers4.life, cujos termos proíbem ferramentas automatizadas.
- Os preços vêm da API do [aion2.exchange](https://aion2.exchange), um projeto não oficial. O servidor guarda cada catálogo por 15 minutos para fazer poucas requisições.
- As imagens vêm do dicionário de itens da NCSOFT em Taiwan, que não tem API documentada e pode mudar sem aviso. O servidor guarda cada imagem em memória até ser reiniciado. Se a busca falhar, o cálculo continua e a linha fica sem imagem.

## Testes

```bash
npm test
```

Os testes usam um servidor simulado e não acessam o aion2.exchange.

## Aviso

Projeto de fã, sem afiliação com a NCSOFT, o gamers4.life ou o aion2.exchange. Aion 2 e os dados e imagens do jogo pertencem aos respectivos donos.
