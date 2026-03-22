import {
    update_arrows,
    add_menu_functions,
    close_link_mode,
    print,
    public_print,
    create_new_element,
    toggle_physics,
    draw_bkg,
    update_nodes,
    adjustTextWidth
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
melhorar texto de ajuda com imagens e separadores
highlights das conexões vem do nodo origem e não só dos parentes imediatos
*/

/* TODO Funcionalidades
botao para focar a imagem no centro de massa, para nao correr o risco de afastar a camara de tudo
botão para encontrar nodo especifico
pedir confirmação antes de limpar canvas (apagar nodos todos)
! medir quando foi feita alguma mudança à rede. Só pedir confirmação de dar load quando houver alguma mudança
! settings tab com a possibilidade de modificar os parametros da simulação fisica dinamicamente
*/

/* TODO Bugs
Quando se inicia o pan não funciona logo, só depois do primeiro click
*/ 

/* TODO Small Things
passar codigo para ingles
adicionar instruções de scroll ao tutorial
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
    // just in case some notes were taken, save them
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



document.addEventListener("wheel", (event)=>{ 
    // Event listener for scrolling
    // When scrolling while pressinf shift, expand/contract a nearby conncetion 
    // Otherwise, zoom in/out

    if (globals.box_opened) return

    const scrollX = event.clientX
    const scrollY = event.clientY


    if (event.shiftKey){
        // Find if we scrolled near a conection line
        document.querySelectorAll('.line').forEach(l =>{
            // First, find the position of the ends of the line
            let startX = parseFloat(l.style.getPropertyValue('--tx'))
            let startY = parseFloat(l.style.getPropertyValue('--ty'))
    
            let rotation = parseFloat(l.style.getPropertyValue('--rotation'))
            let width = parseFloat(l.style.getPropertyValue('--scale')) * 100
    
            let endX = startX + width * Math.cos(rotation)
            let endY = startY + width * Math.sin(rotation)
    
            const dist = find_pseudoDistance(scrollX,scrollY, startX, startY, endX, endY)
            if (dist < 5){ // If we scrolled near a connection, change its size
                const originNode = globals.arrows.find(a => a._line == l).parent
                const destNode = globals.arrows.find(a => a._line == l).child
                originNode.connections.find(c => c.dest === destNode).size *= 1 + event.deltaY/1000
            }
        })
    }
    // If not pressing shift, zoom in/out
    else{
        // zoom is by default 1, deltaY is 100/-100 
        // zooming should change the node size, conection length and text size
        // if too zoomed out, hide the text

        // set a max and min zoom
        if (globals.zoom < 0.4 && event.deltaY < 0) return 

        globals.zoom += event.deltaY/1000 //this will affect the conection size by updating x0 in physics
        globals.nodeRadius = Math.min(10.5 * globals.zoom, 20)

        globals.nodes.forEach(n => {
            n.style.setProperty('--diameter', (globals.nodeRadius * 2) + 'px')
        })

        document.querySelectorAll('.line').forEach(l =>{
            // default height is 3px
            // remove 1 from that due to zoom being 1 by default
            l.style.height = 2 + 1.5*globals.zoom + 'px'
        })
        document.querySelectorAll('.tip').forEach(t =>{
            // default width is 9px
            // remove 1 from that due to zoom being 1 by default
            t.style.width = 8 + 1.5*globals.zoom + 'px'
        })

        document.querySelectorAll('.node .text').forEach(t => {
            // default size is 14px
            if (globals.zoom > 0.6) {
                t.classList.remove('hidden')
                t.style.setProperty('--size', Math.min(14*globals.zoom, 18) + 'px')
                adjustTextWidth(t)
            }
            else{
                t.classList.add('hidden')
            }
        })

        // Update arrow positions after zooming
        update_arrows();
    }
})

function find_pseudoDistance(px, py, x1, y1, x2, y2) {
// Compute the distance between a point (px,py) and a line segment
  const dx = x2 - x1;
  const dy = y2 - y1;

  // Projection parameter on infinite line
  const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);

  // If projection lies within segment
  if (t >= 0 && t <= 1) {
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    return Math.hypot(px - projX, py - projY);
  }

  // Otherwise distance to closest endpoint
  const distStart = Math.hypot(px - x1, py - y1);
  const distEnd   = Math.hypot(px - x2, py - y2);
  return Math.min(distStart, distEnd);
}


window.menu = menu // For some reason this is necessary