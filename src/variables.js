// Here, i'll keep global variables that can be changed by both files



export const globals = {
    nodes: [], // Instead of looping through the DOM every time i need the nodes, keep them in an array for faster access
    arrows: [], // Same thing but for the arrows connecting nodes
    
    link_mode_on: false,
    simulating: false,
    isMouseDown: false,
    dragged: false,

    start_coords: [0,0],
    end_coords: [0,0],

    box_opened: false, // when a details box is opened, disable dragging the screen

    current_save_file: ""
};