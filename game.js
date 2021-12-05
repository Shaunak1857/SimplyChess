game = new Chess();
var socket = io();

const SpeechRecognition = window.webkitSpeechRecognition;
const recognition = new webkitSpeechRecognition();
recognition.lang = 'en-US';
recognition.interimResults = false;


var color = "white";
var players;
var roomId;
var play = true;

var room = document.getElementById("room")
var roomNumber = document.getElementById("roomNumbers")
var button = document.getElementById("button")
var state = document.getElementById('state')

var connect = function () {
    roomId = room.value;
    if (roomId !== "" && parseInt(roomId) <= 100) {
        room.remove();
        roomNumber.innerHTML = "Room Number " + roomId;
        button.remove();
        socket.emit('joined', roomId);
        synthVoice("Joined room " + roomId);
    }
}

document.getElementById("inputSpeech").addEventListener("click", function (e) {
    if (game.game_over() === true || play) {
        synthVoice("No game in progress");
    } else if ((game.turn() === 'w' && color === 'black') ||
        (game.turn() === 'b' && color === 'white')) {
        synthVoice("Wait for your turn");
    } else {
        console.log("Listening for user...");
        recognition.start();
    }
});

recognition.addEventListener('result', (e) => {
    let last = e.results.length - 1;
    let text = e.results[last][0].transcript;
    console.log("User said: " + text);
    console.log('Confidence: ' + e.results[0][0].confidence);

    text = text.toLowerCase().replaceAll("for", "4").replaceAll(" ", "").replaceAll("-", "");
    let text1 = text.substring(0, 2);
    let text2 = text.substring(3);
    text2 = text2.substring(text2.length - 2, text2.length);
    console.log("from: " + text1 + " to: " + text2);

    /*
    add onDragStart and onDrop functionality here
    */
    synthVoice(text);
    var move = game.move({
        from: text1,
        to: text2,
        promotion: 'q' // NOTE: always promote to a queen for example simplicity
    });
    if (game.game_over()) {
        state.innerHTML = 'GAME OVER';
        socket.emit('gameOver', roomId)
    }

    // illegal move
    if (move === null)
        synthVoice("illegal move");
    else {
        socket.emit('move', { move: move, board: game.fen(), room: roomId });
        board.position(game.fen());
    }



});

function synthVoice(text) {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance();
    utterance.text = text;
    synth.speak(utterance);
}


socket.on('full', function (msg) {
    if (roomId == msg)
        window.location.assign(window.location.href + 'full.html');
});

socket.on('play', function (msg) {
    if (msg == roomId) {
        play = false;
        state.innerHTML = "Game in progress."
        synthVoice("All players connected. Game now in progress. Player white may start.");
    }
    // console.log(msg)
});

socket.on('move', function (msg) {
    if (msg.room == roomId) {
        console.log(msg);
        synthVoice(msg.move.piece + " to " + msg.move.to);
        game.move(msg.move);
        board.position(game.fen());
        console.log("moved")
    }
});

var removeGreySquares = function () {
    $('#board .square-55d63').css('background', '');
};

var greySquare = function (square) {
    var squareEl = $('#board .square-' + square);

    var background = '#a9a9a9';
    if (squareEl.hasClass('black-3c85d') === true) {
        background = '#696969';
    }

    squareEl.css('background', background);
};

var onDragStart = function (source, piece) {
    // do not pick up pieces if the game is over
    // or if it's not that side's turn
    if (game.game_over() === true || play ||
        (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1) ||
        (game.turn() === 'w' && color === 'black') ||
        (game.turn() === 'b' && color === 'white')) {
        return false;
    }
    // console.log({play, players});
};

var onDrop = function (source, target) {
    removeGreySquares();

    // see if the move is legal
    var move = game.move({
        from: source,
        to: target,
        promotion: 'q' // NOTE: always promote to a queen for example simplicity
    });
    if (game.game_over()) {
        state.innerHTML = 'GAME OVER';
        socket.emit('gameOver', roomId);
        synthVoice("Game over.");
    }

    // illegal move
    if (move === null) return 'snapback';
    else
        socket.emit('move', { move: move, board: game.fen(), room: roomId });

};

var onMouseoverSquare = function (square, piece) {
    // get list of possible moves for this square
    var moves = game.moves({
        square: square,
        verbose: true
    });

    // exit if there are no moves available for this square
    if (moves.length === 0) return;

    // highlight the square they moused over
    greySquare(square);

    // highlight the possible squares for this piece
    for (var i = 0; i < moves.length; i++) {
        greySquare(moves[i].to);
    }
};

var onMouseoutSquare = function (square, piece) {
    removeGreySquares();
};

var onSnapEnd = function () {
    board.position(game.fen());
};


socket.on('player', (msg) => {
    var plno = document.getElementById('player')
    color = msg.color;

    plno.innerHTML = 'Player ' + msg.players + " : " + color;
    synthVoice("You are player " + msg.players + ", " + color + " side.");
    players = msg.players;

    if (players == 2) {
        play = false;
        socket.emit('play', msg.roomId);
        state.innerHTML = "Game in progress."
        synthVoice("All players connected. Game now in progress. Player white may start.");
    }
    else {
        state.innerHTML = "Waiting for second player...";
        synthVoice("Waiting for second player...");
    }

    var cfg = {
        orientation: color,
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onMouseoutSquare: onMouseoutSquare,
        onMouseoverSquare: onMouseoverSquare,
        onSnapEnd: onSnapEnd
    };
    board = ChessBoard('board', cfg);
});
// console.log(color)

var board;
