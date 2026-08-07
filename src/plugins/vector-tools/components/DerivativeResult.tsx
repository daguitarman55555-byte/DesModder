import VectorTools from "..";
import { Component, jsx } from "#DCGView";
import { If, IfElse, StaticMathQuillView } from "#components";
import "./DerivativeResult.less";

/**
 * The result of a recognized derivative row, shown under the expression the way
 * Desmos shows an evaluation.
 *
 * Desmos has no symbolic results and renders nothing here on its own — a row
 * reading `∂/∂x 2xy` is an unrecognized symbol to it. So this is the only place
 * the answer can appear, and it is typeset as real math rather than text, to
 * match the box Desmos puts `=2` in when you type `1+1`.
 */
export class DerivativeResult extends Component<{
  vectorTools: () => VectorTools;
  id: () => string;
}> {
  template() {
    const vectorTools = this.props.vectorTools();
    const result = () => vectorTools.derivativeResultFor(this.props.id());
    return (
      <If predicate={() => result() !== undefined}>
        {() => (
          <div class="dsm-vector-tools-derivative">
            {IfElse(() => result()?.ok === true, {
              true: () => (
                <span class="dsm-vector-tools-derivative-value">
                  <StaticMathQuillView
                    latex={() => {
                      const value = result();
                      return value?.ok === true ? `=${value.latex}` : "";
                    }}
                  />
                </span>
              ),
              false: () => (
                <span class="dsm-vector-tools-derivative-error">
                  {() => {
                    const value = result();
                    return value?.ok === false ? value.error : "";
                  }}
                </span>
              ),
            })}
          </div>
        )}
      </If>
    );
  }
}

export function DerivativeResultFn(vectorTools: VectorTools, id: string) {
  return <DerivativeResult vectorTools={() => vectorTools} id={() => id} />;
}
