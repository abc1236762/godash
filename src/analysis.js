import {curry, compose, isNumber, map, fill, zip, range, identity, flatten} from 'lodash';
import {Map, List, Set} from 'immutable';


/**
 * Value on a board representing a black stone.
 */
export const BLACK = 'black';


/**
 * Value on a board representing a white stone.
 */
export const WHITE = 'white';


/**
 * @private
 */
export const EMPTY = null;


/**
 * @private
 */
export const SIZE_KEY = 'size';


/**
 * @private
 */
export function allPossibleMoves(size) {
    return Set(flatten(map(
        range(size),
        i => map(
            zip(range(size), fill(Array(size), i)),
            List
        )
    )));
}


/**
 * Returns unoccupied positions on the board.
 *
 * @private
 * @param {Map} board
 * @returns {Set}
 */
export function emptyPositions(board) {
    return allPossibleMoves(board.get(SIZE_KEY)).subtract(board.keys());
}


/**
 * Gets the spaces immediately touching the passed position.
 *
 * Considers the board size and acts correctly on sides and corners.
 *
 * @private
 * @param {Map} board
 * @param {List} position
 * @returns {Set}
 */
export function adjacentPositions(board, position) {
    const inc = i => i + 1;
    const dec = i => i - 1;
    const size = board.get(SIZE_KEY);
    const [x, y] = [position.first(), position.last()];
    const check = compose(
        curry(Math.min, 2)(size - 1),
        curry(Math.max, 2)(0)
    );

    return Set([
        [identity, inc],
        [identity, dec],
        [inc, identity],
        [dec, identity],
    ].map(
        ([first, last]) => List.of(check(first(x)), check(last(y)))
    )).subtract(Set.of(position));
}


/**
 * Similar to {@link adjacentPositions}, but filters on a state.
 *
 * @private
 * @param {Map} board
 * @param {List} position
 * @param {string} color
 * @returns {Set}
 */
export function matchingAdjacentPositions(board, position, color) {
    if (color === undefined) {
        color = board.get(position, EMPTY);
    }

    return adjacentPositions(board, position)
        .filter(pos => board.get(pos, EMPTY) === color);
}


/**
 * Gets a set of positions of the logical group associated with the given position.
 *
 * @private
 * @param {Map} board
 * @param {List} position
 * @returns {Set}
 */
export function group(board, position) {
    let found = Set();
    let queue = Set.of(position);

    while (!queue.isEmpty()) {
        const current = queue.first();
        const more_matching = matchingAdjacentPositions(board, current);

        found = found.add(current);
        queue = queue.rest().union(more_matching.subtract(found));
    }

    return found;
}


/**
 * Counts liberties for the stone at the given position.
 *
 * @private
 * @param {Map} board
 * @param {List} position
 * @returns {number}
 */
export function liberties(board, position) {
    return group(board, position).reduce(
        (acc, pos) => acc.union(matchingAdjacentPositions(board, pos, EMPTY)),
        Set()
    ).size;
}


/**
 * Returns {@link BLACK} if {@link WHITE}, {@link WHITE} if {@link BLACK}.
 *
 * @private
 * @param {string} color
 * @throws {string} when color is neither black nor white
 * @returns {string}
 */
export function oppositeColor(color) {
    if (color !== BLACK && color !== WHITE) {
        throw 'Must pass in a color';
    }
    return color === BLACK ? WHITE : BLACK;
}


/**
 * Checks if given position is a valid play for the given color.
 *
 * @private
 * @param {Map} board
 * @param {List} position
 * @param {List} color
 * @returns {boolean}
 */
export function isLegalMove(board, position, color) {
    const will_have_liberty = liberties(board.set(position, color), position) > 0;
    const will_kill_something = matchingAdjacentPositions(board, position, oppositeColor(color))
        .some(pos => liberties(board, pos) === 1);

    return will_have_liberty || will_kill_something;
}


/**
 * @private
 */
export function prettyString(board) {
    const size = board.get(SIZE_KEY);
    let pretty_string = '';

    for (var i = 0; i < size; i++) {
        for (var j = 0; j < size; j++) {
            let color = board.get(List.of(i, j), EMPTY);
            switch(color) {
                case BLACK:
                    pretty_string += 'O';
                    break;
                case WHITE:
                    pretty_string += 'X';
                    break;
                case EMPTY:
                    pretty_string += '+';
                    break;
            }
        }
        pretty_string += '\n';
    }
    return pretty_string;
}


/**
 * @private
 */
export function emptyBoard(size) {
    if (!isNumber(size) || size <= 0 || size !== parseInt(size)) {
        throw 'An empty board must be created from a positive integer.';
    }

    return Map().set(SIZE_KEY, size);
}

/**
 * @private
 */
export function addMove(board, position, color) {
    if (!isLegalMove(board, position, color)) {
        throw 'Not a valid position';
    }

    if (board.has(position)) {
        throw 'There is already a stone there';
    }

    const killed = matchingAdjacentPositions(board, position, oppositeColor(color)).reduce(
        (acc, pos) => acc.union(liberties(board, pos) === 1 ? group(board, pos) : Set()),
        Set()
    );

    return removeMoves(board, killed).set(position, color);
}


/**
 * @private
 */
export function removeMoves(board, positions) {
    return positions.reduce(
        (acc, position) => acc.delete(position),
        board
    );
}
