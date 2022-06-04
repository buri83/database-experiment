import { createMachine, interpret, Interpreter, StateMachine } from "xstate";
import { createModel } from "xstate/lib/model";

namespace State {
    export enum Forward {
        Init = "Init",
        UserVerifying = "UserVerifying",
        PointTaking = "PointTaking",
        CreditCardAuthorizing = "CreditCardAuthorizing",
        Completed = "Completed",
    }

    export enum Backward {
        PointRefunding = "PointRefunding",
        RolledBack = "RolledBack",
        RollBackFailed = "RollBackFailed",
    }
}

type State = State.Forward | State.Backward;

type Events = { type: "success" } | { type: "failed" };

interface Schema {
    states: {
        Init: {};
        UserVerifying: {};
        PointTaking: {};
        CreditCardAuthorizing: {};
        Completed: {};
        PointRefunding: {};
        RolledBack: {};
        RollBackFailed: {};
    };
}

const orderStateMachine = createMachine<State>({
    schema: {
        context: {} as State,
        events: {} as Events,
    },

    id: "orderStateMachine",
    initial: State.Forward.Init,

    states: {
        // Forwards
        [State.Forward.Init]: {
            on: { success: State.Forward.UserVerifying, failed: State.Backward.RolledBack },
        },
        [State.Forward.UserVerifying]: {
            on: { success: State.Forward.PointTaking, failed: State.Backward.RolledBack },
        },
        [State.Forward.PointTaking]: {
            on: { success: State.Forward.CreditCardAuthorizing, failed: State.Backward.RolledBack },
        },
        [State.Forward.CreditCardAuthorizing]: {
            on: { success: State.Forward.Completed, failed: State.Backward.PointRefunding },
        },
        [State.Forward.Completed]: {
            type: "final",
        },

        // BackWards
        [State.Backward.PointRefunding]: {
            on: { success: State.Backward.RolledBack, failed: State.Backward.RollBackFailed },
        },
        [State.Backward.RolledBack]: {
            type: "final",
        },
        [State.Backward.RollBackFailed]: {
            type: "final",
        },
    },
});

let state = orderStateMachine.initialState;

console.log(state.value);

state = orderStateMachine.transition("state", "succeass");

console.log(state.value);
