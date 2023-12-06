const lista = [];
const teste = { teste: { A: 1, B: 2, C: 3 } };
const teste2 = { teste2: { A: 4, B: 5, C: 6 } };
const teste3 = { teste3: { A: 7, B: 8, C: 9 } };
const teste4 = { teste4: { A: 10, B: 11, C: 12 } };

lista.push(teste);
lista.push(teste2);
lista.push(teste3);
lista.push(teste4);

//testar se o elemento B dos objetos testes é par e printar o resultado
console.log(lista);
lista.forEach((element) => {
    if (element[Object.keys(element)[0]].B % 2 == 0) console.log("Par");
    else console.log("Impar");
});

//ver se a chave teste3 existe na lista e retornar o objeto
const teste7 = lista.find((element) => {
    return Object.keys(element)[0] == "teste3";
});
console.log(teste7);

//trocar o valor de teste2 com o valore de teste 3 na lista
const teste8 = lista.find((element) => {
    return Object.keys(element)[0] == "teste2";
});
const teste9 = lista.find((element) => {
    return Object.keys(element)[0] == "teste3";
});
const index = lista.indexOf(teste8);
lista[index] = teste9;
console.log(lista);
