// Here, i'll keep global variables that can be changed by both files

// export const nodes = [];

// let link_mode_on = false; // while this mode is on, clicking on a node will link the origin node to it
// let simulating = false;
// let isMouseDown = false;


// export function get_global(variable){
//     if (variable === "simulating"){
//         return simulating
//     }
//     if (variable === "link_mode_on"){
//         return link_mode_on
//     }
//     if (variable === "isMouseDown"){
//         return isMouseDown
//     }
// }

// export function set_global(variable, value){
//     if (variable === "simulating"){
//         simulating = value
//     }
//     if (variable === "link_mode_on"){
//         link_mode_on = value
//     }
//     if (variable === "isMouseDown"){
//         isMouseDown = value
//     }
// }


export const globals = {
    nodes: [],
    link_mode_on: false,
    simulating: false,
    isMouseDown: false,
    dragged: false,

    start_coords: [0,0],
    end_coords: [0,0],

    box_opened: false, // when a details box is opened, disable dragging the screen

    current_save_file: ""
};