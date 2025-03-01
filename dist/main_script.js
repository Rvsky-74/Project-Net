const canvas = document.getElementById('circleCanvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const ctx = canvas.getContext('2d');
const container = document.getElementById("canvas-container");
const nodes = [];


let isMouseDown = false;
let start_coords = [0,0];
let end_coords = [0,0];
let dragged = false;

const color_code = {dark_red: "171,28,33", 
                    dark_green: "49,180,96", 
                    dark_purple: "50,0,100",
                    light_red: "204,119,136",
                    light_green: "132,221,145",
                    light_purple: "122,102,162"    
                    };

                    
let box_opened = false; //when a details box is opened, disable dragging the screen
let link_mode_on = false; //while this mode is on, clicking on a node will link the origin node to it
let origin_node = null;
let keep_box = false;


let bkg_x_off = 0; //variaveis globais onde guardo a "localização do background"
let bkg_y_off = 0;


let centro = [canvas.width/2, canvas.height/2]; //centro do canvas, para onde os nodos vão ser atraidos



draw_bkg();

// Funcionamento geral
// Se uma seta aponta de x para y, então x precisa de y (y é pré-requisito de x)
// Uma tarefa nao concluida mas que pode ser concluida (todas os seus pre-requisitos estão cumpridos) aparece com o contorno a tracejado


/* TODO Coisas gráficas
imagens para os botoes de load, save e help
melhorar texto de ajuda com imagens
*/

/* TODO Funcionalidades
scroll to zoom (quando a visão está afastada nao mostrar o texto)
*/






function add_node(x=null, y=null, name=null){
/**********************************************************************************************************************************
    Recebe: 
            (x,y) -> coordenadas do novo nodo no canvas (caso sejam fornecidas; caso contrário, são aleatórias)
    Retorna:
            Adiciona um nodo à lista "nodes", com as propriedades:
                - Lista "connections" (inicialmente vazia)
                - Posição (aleatória ou especificada)
                - Raio fixo e opacidade
                - Nome a partir do texto da caixa de entrada acima do canvas
                - Cor que começa como roxa e vai mudar dependendo do estado do nodo
***********************************************************************************************************************************/

    //check if name already exists, if so place a plus in front
    while (!is_name_available(name)){
        name += '+';
    }


    const node = document.createElement("div");
    node.classList.add("node", "default", "doable");
    node.style.left = (x!=null) ? x + "px" : Math.random()*canvas.width + "px";
    node.style.top = (y!=null) ? y + "px" : Math.random()*canvas.height + "px";    
   
    node.connections = [];

    node.name = name;
    node.movimento = [0,0];
    node.state = "default";
    node.x = parseInt(node.style.left, 10);
    node.y = parseInt(node.style.top, 10);

    container.appendChild(node);
    nodes.push(node); 

    add_highlight_function(node);
    add_onClick_function(node);

    const text = document.createElement("div");
    text.className = "text";
    text.textContent = name;
    node.appendChild(text);

    if (!simulating) toggle_physics();
}

function createNode(name, x, y, state=null){
    const node = document.createElement("div");
    node.classList.add("node", (state != null) ? state:"default", "doable");

    node.x = x;
    node.y = y;
    node.name = name;
    if (state) node.state = state;
    node.connections = [];

    node.movimento = [0,0];

    node.style.top = y + 'px';
    node.style.left = x + 'px';

    container.appendChild(node);
    nodes.push(node); 

    add_highlight_function(node);
    add_onClick_function(node);

    const text = document.createElement("div");
    text.className = "text";
    text.textContent = name;
    node.appendChild(text);
}



function draw_bkg(x_ofset = 0, y_ofset = 0){    
/**********************************************************************************************************************************
    Recebe:
            x_ofset, y_ofset -> Deslocamentos no plano para redesenhar o grid
    Retorna:
            Desenha o grid de fundo no canvas
***********************************************************************************************************************************/
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    function drawCross(x, y){
        const cross_size = 3;
        const color = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.moveTo(x-cross_size, y);
        ctx.lineTo(x+cross_size, y);
        ctx.moveTo(x, y-cross_size);
        ctx.lineTo(x, y+cross_size);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    if (!link_mode_on){
        const step = 20;
        let x_off = x_ofset + bkg_x_off;
        let y_off = y_ofset + bkg_y_off;
        while (x_off > step/2) x_off -= step;
        while (x_off < -step/2) x_off += step;
        while (y_off > step/2) y_off -= step;
        while (y_off < -step/2) y_off += step;
        for (let i = x_off; i <= canvas.width + x_off; i+=step){
            for (let j = y_off; j <= canvas.height + y_off; j+=step){
                drawCross(i, j);
            } 
        }
    }
}







function open_options(n){
/**********************************************************************************************************************************
    Recebe:
            n -> nodo que foi clicado
    Retorna:
            Abre a caixa de opções para o nodo
            Enquanto a caixa está aberta, física e arrastar ecrã estão desabilitados
            A caixa permite:
                entrar no modo link, que permite fazer conexões
***********************************************************************************************************************************/
    if (simulating) toggle_physics(); // stop physics simulation 
    box_opened = true;
    [x, y] = [n.x, n.y];


    ///////// Criar a caixa onde vão estar os botões /////////
    const box = create_new_element("div", container, id = "box", classes = ["box", n.state]);
    box.style.left = `${x}px`;
    box.style.top = `${y}px`;


    
    ////////////////// Botão para mudar estado ///////////////////

    // Estrutura contendo o botão e o texto descritivo
    const first_line = create_new_element("div", box, null, ["button-text-wrapper"]);

    // Texto
    const text = create_new_element("div", first_line, null, classes=["state-text"]);
    text.textContent = (n.state === "default") ? "undefined" : n.state;

    // Botão de mudança de estado
    const toggle_state = create_new_element("button", first_line, null, classes=["rounded-square-btn", n.state]);
    const inner_circle = create_new_element("div", toggle_state, null, classes=["small-circle"]);

    // Funcionalidade de mudar de estado
    toggle_state.addEventListener("click", (event)=>{
        toggle_state.classList.toggle("active");

        const new_state = (n.state === "default" || 
                           n.state === "uncompleted") ? 
                           "completed" : "uncompleted";

        box.classList.replace(n.state, new_state);
        toggle_state.classList.replace(n.state, new_state);
        n.classList.replace(n.state, new_state);
        text.textContent = new_state;
        

        update_colors(n, n.state, new_state);
    }); 




    ////////////////// Botão para ativar modo de ligações ///////////////////
    const second_line = create_new_element("div", box); 

    const make_connections = create_new_element("button", second_line, id="b1", classes=["link-button"]);  
    make_connections.textContent = "Make Connections";
    make_connections.addEventListener("click", (event)=>{
        // Inicia o modo de selecionar ligações
        link_mode_on = true;
        origin_node = n;
        draw_bkg();

        box.remove();
        box_opened = false;

        // make it visually obvious that we are in connection mode
        canvas.classList.replace("canvas-default", "canvas-alt"); 
        public_print("Select pre-requisites for this task");
    });
}




let menu_opened = false;
function menu(){
/**********************************************************************************************************************************
    Recebe: ---
    Retorna:
            Abre/fecha o menu de opções      
    Chamada por:
            on_click do menu button, diretamente do html          
***********************************************************************************************************************************/
    menu_opened = !menu_opened;
    
    if (!menu_opened){ //if we closed the menu
        const object = document.querySelectorAll(".menu-dropdown").forEach(element => {
            element.addEventListener("animationend", (event) => {
                element.remove();
            });
            element.classList.remove("animate");
            element.classList.add("reverse");
        });
        return;
    }


    const menu_dropdown = create_new_element("div", container, null, ["menu-dropdown", "animate"]);


    const add_node_button = create_new_element("button", menu_dropdown, "addbutton", ["add-node"]);

    const save_button = create_new_element("button",  menu_dropdown, "savebutton", ["base"]);
    const save_icon = create_new_element("div", save_button, null, ["icon"]);
    save_icon.style.maskImage = "url(save.svg)";

    const load_button = create_new_element("button", menu_dropdown, "loadbutton", ["base"]);
    const load_icon = create_new_element("div", load_button, null, ["icon"]);
    load_icon.style.maskImage = "url(load.svg)";

    const delete_button = create_new_element("button", menu_dropdown, "deletebutton", ["base"]);
    const delete_icon = create_new_element("div", delete_button, null, ["icon"]);
    delete_icon.style.maskImage = "url(trash.svg)";

    const info_button = create_new_element("button", menu_dropdown, "infobutton", ["base"]);
    const info_icon = create_new_element("div", info_button, null, ["icon"]);
    info_icon.style.maskImage = "url(question-mark.svg)";
    info_icon.style.maskSize = "90%";


    const button_amount = 5;
    const button_height = 40;
    const gaps = 5; //space between buttons 
    const dropdown_height = button_amount*button_height + (button_amount-1)*gaps + 2*gaps; //the extra gap is for the bottom and top

    menu_dropdown.style.height = `${dropdown_height}px`;


    add_menu_functions(add_node_button, delete_button, save_button, load_button, info_button);
    
    

}





window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    draw_bkg();
});

let hold_timeout;  
document.addEventListener("click", (event) => {
    isMouseDown = false;
    clearInterval(hold_timeout);

    // stop link mode when we click outside a node
    if (link_mode_on && !event.target.closest(".node") && !event.target.closest(".box") && !dragged) {close_link_mode(); draw_bkg();};

    // if the input box was opened and we 
    // clicked neither in it nor in the button to create it, delete the input box
    if (document.querySelector(".input-box") && !(event.target.matches(".add-node, .add-node *") || event.target.matches(".input-box"))){
        document.querySelector(".input-box").remove();
    }

    //if we clicked outside the info box, close it 
    if (!event.target.closest("#box")) {
        document.querySelectorAll("#box").forEach(element => element.remove());
        box_opened = false;      
        
        if (!simulating && !link_mode_on) toggle_physics();
    }

    if (dragged){ 
        update_nodes();
    }
    start_coords = end_coords;

});



canvas.addEventListener('mousedown', function(event) {
    start_dragging(event.clientX, event.clientY);

    //after the welcome message, any help from the title text disapears after a click
    if (document.getElementById("Canvas_Text").innerText != "Welcome") public_print("");
});



let previously_inside = false;
let x = 0;
let y = 0;
canvas.addEventListener('mousemove', function(event) {
    const rect = canvas.getBoundingClientRect();

    [x, y] = [event.clientX - rect.left, event.clientY - rect.top];



    if (isMouseDown && !box_opened) { //dragging the map, only possible when there is no opened info box

        end_coords = [event.clientX - rect.left, event.clientY - rect.top];

        const dx = end_coords[0] - start_coords[0];
        const dy = end_coords[1] - start_coords[1];


        // Translate nodes and connections         
        // This is only a visual change, it doesnt affect the actual position of the nodes
        nodes.forEach((node) => {
            const initial = node.initialTranslate;
            node.style.transform = `translate(${initial.x + dx}px, ${initial.y + dy}px)`;
        });
        update_arrows(dx,dy);


        draw_bkg(x_ofset=dx, y_ofset=dy);
        dragged = true;

        return;
    }
});





let simulating = false; 
let intervalId; // Necessário para criar um ciclo interrompível
function toggle_physics(){
/**********************************************************************************************************************************
    Recebe: ---
    Retorna:
            Começa a animação/simulação fisica dos nodos:
                nodos nao relacionados afastam-se
                nodos relacionados tentam manter uma distância fixa
                nestrutura tenta manter-se no centro do canvas
***********************************************************************************************************************************/


    if (simulating){ //stop the simulation
        simulating = false;
        clearInterval(intervalId);
    }
    else{
        simulating = true; //if this function is called again, physics simulation should stop
        intervalId = setInterval(() => { //setInterval calls physics() at regular intervals
            physics();
          }, 9); //tempo entre chamadas à função em ms
    }

    function physics(){
        const deltaT = 0.01;
        const x0 = 50;
        const junction_strength = 0.2;
        const repel_strength = 200000;
        const center_force = 30;

        for (let i = 0; i<nodes.length; i++){
            nodes[i].movimento = [0,0];
        }

        for (let i = 0; i<nodes.length; i++){ // calcular a resultante das forças no nodo e guardar em movivento
            n0 = nodes[i];

            for (let j = 0; j<nodes.length; j++){
                if (j!=i){
                    n1 = nodes[j];

                    let dist = Math.sqrt((n0.x - n1.x)**2 + (n0.y - n1.y)**2); 

                    if(dist < 20){ //limitar a força de repulsão para evitar que os nodos expludam
                        dist = 20;  
                    } 
                    
                    vetor_diff = [(n1.x - n0.x)/dist, (n1.y - n0.y)/dist] //vetor de n0 para n1, normalizado
                    
                    
                    if (n0.connections.includes(n1)){ //if the 2 nodes are related            
                    // act like a spring that tends to a relaxation length x0
                        const displacement = dist - x0; // quando é: negativo -> afastam-se | positivo -> atraem-se 
                        n0.movimento[0] += vetor_diff[0]*displacement*junction_strength;
                        n0.movimento[1] += vetor_diff[1]*displacement*junction_strength;

                        n1.movimento[0] -= vetor_diff[0]*displacement*junction_strength;
                        n1.movimento[1] -= vetor_diff[1]*displacement*junction_strength;
                    }
                    else{ 
                    // unrelated nodes repel with a force proportional to their distance
                        n0.movimento[0] -= vetor_diff[0]*repel_strength/ ((dist**2));
                        n0.movimento[1] -= vetor_diff[1]*repel_strength/ ((dist**2));
                    }
                }

                //all nodes should be atracted to the center of the screen
                // centro = [canvas.width/2, canvas.height/2];
                const norm = Math.sqrt(n0.x**2 + n0.y**2);
                vetor_centro = [(centro[0] - n0.x)/norm, (centro[1] - n0.y)/norm];
                n0.movimento[0] += vetor_centro[0]*center_force;
                n0.movimento[1] += vetor_centro[1]*center_force;
      
            }
        }

        let is_there_movement = false
        // atualizar a posição de cada nodo de acordo com a sua resultante das forças (movimento)
        document.querySelectorAll(".node").forEach((node) => {
            node.x += node.movimento[0]*deltaT;
            node.y += node.movimento[1]*deltaT;

            if (isMouseDown){
                node.initialTranslate.x += node.movimento[0]*deltaT;
                node.initialTranslate.y += node.movimento[1]*deltaT;
            }
            const position_matrix = getTranslateValues(node);
            node.style.transform = `translate(${position_matrix.x + node.movimento[0]*deltaT}px, ${position_matrix.y + node.movimento[1]*deltaT}px)`;

            
            if (node.movimento[0]**2 + node.movimento[1]**2 > 16){ 
                //parar se nenhuma particula se mexer a mais de 4 pixeis/s
                is_there_movement = true;
            }
        });
        const dx = (dragged) ? end_coords[0] - start_coords[0] : 0;
        const dy = (dragged) ? end_coords[1] - start_coords[1] : 0;
        update_arrows(dx, dy);
    }
}









