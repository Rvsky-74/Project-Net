import {
    update_arrows,
    add_menu_functions,
    close_link_mode,
    print,
    public_print,
    create_new_element,
    toggle_physics,
    draw_bkg,
    update_nodes
} from './extras.js'

import {
    globals
} from './variables.js'



const canvas = document.getElementById('circleCanvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const container = document.getElementById("canvas-container");



draw_bkg();



/* TODO Coisas gráficas
melhorar texto de ajuda com imagens
scroll to zoom (quando a visão está afastada nao mostrar o texto)
*/

/* TODO Funcionalidades
botao para focar a imagem no centro de massa, para nao correr o risco de afastar a camara de tudo
botão para encontrar nodo especifico
pedir confirmação antes de limpar canvas (apagar nodos todos)
! medir quando foi feita alguma mudança à rede. Só pedir confirmação de dar load quando houver alguma mudança
settings tab com a possibilidade de modificar os parametros da simulação fisica dinamicamente
! No menu do nodo, deixar espaço para escrever um texto descritivo
*/

/* TODO Otimizaçoes
passar codigo para ingles
*/






let menu_opened = false;
export function menu(){
/**********************************************************************************************************************************
    Recebe: ---
    Retorna:
            Abre/fecha o menu de opções      
    Chamada por:
            on_click do menu button, diretamente do html          
***********************************************************************************************************************************/
    menu_opened = !menu_opened;
    
    if (!menu_opened){ //if we closed the menu, do the closing animation ("reverse")
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
    globals.isMouseDown = false

    clearInterval(hold_timeout);

    // stop link mode when we click outside a node
    if (globals.link_mode_on && !event.target.closest(".node") && !event.target.closest(".box") && !globals.dragged) close_link_mode();

    // if the input box was opened and we 
    // clicked neither in it nor in the button to create it, delete the input box
    if (document.querySelector(".input-box") && !(event.target.matches(".add-node, .add-node *") || event.target.matches(".input-box"))){
        document.querySelector(".input-box").remove();
    }

    // If we opened the save files menu and clicked outside it or outside the button to create it, close it
    // The * in .matches refers to the classes child objects
    if (document.querySelector(".save-files-menu") && !(event.target.matches(".save-files-menu, .save-files-menu *") || event.target.matches("#loadbutton, #loadbutton *") || event.target.matches("#savebutton, #savebutton *"))){
        document.querySelector(".save-files-menu").remove();
    }

    // If we asked for confirmation and clicked outside the box, assume no for an answer (do nothing) and close the box
    if (document.querySelector(".confirmation-box") && !(event.target.matches(".confirmation-box, .confirmation-box *") || event.target.matches(".save-files-menu, .save-files-menu *"))) document.querySelector(".confirmation-box").remove()


    //if we clicked outside the info box, close it 
    if (!event.target.closest("#box")) {
        document.querySelectorAll("#box").forEach(element => element.remove());
        globals.box_opened = false;       
        if (!globals.simulating && !globals.link_mode_on) toggle_physics();
    }

    if (globals.dragged){
        // Reset the movement related vars
        globals.start_coords = [0,0];
        globals.end_coords = [0,0];
        globals.dragged = false;
    }

    //after the welcome message, any help from the title text disapears after a click
    const title = document.getElementById("Canvas_Text").innerText;
    if (title != "Welcome" && !globals.link_mode_on) public_print(globals.current_save_file);


    if (globals.clickingNode){
        globals.clickingNode.mass = 1;
        globals.clickingNode = null;
    }

});



canvas.addEventListener('mousedown', function(event) {
    if (event.button === 0) { // Left mouse click
        globals.isMouseDown = true;

        globals.start_coords = [event.clientX, event.clientY];
        globals.end_coords = [event.clientX, event.clientY];
    }
});








document.addEventListener('mousemove', function(event) {

    //dragging the map, only possible when there is no opened info box and we arent clicking a node
    if (!globals.clickingNode && globals.isMouseDown && !globals.box_opened) { 

        globals.end_coords = [event.clientX, event.clientY];

        const dx = globals.end_coords[0] - globals.start_coords[0];
        const dy = globals.end_coords[1] - globals.start_coords[1];


        globals.dragged = true;

        return;
    }

    // If we move the mouse while clicking a node, move that node
    if (globals.clickingNode && !globals.box_opened){

        // Accumulate drag offset from initial click position
        globals._dragOffsetX += event.movementX;
        globals._dragOffsetY += event.movementY;
    }
});






window.menu = menu // For some reason this is necessary