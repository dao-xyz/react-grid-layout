import React from "react";
import _ from "lodash";
import  { WidthProvider, Responsive } from "react-grid-layout";

const ResponsiveReactGridLayout = WidthProvider(Responsive);

export default class AllowOverlap extends React.PureComponent {
  static defaultProps = {
    className: "layout",
    items: 2,
    rowHeight: 30,
    onLayoutChange: function() { console.log('??? ')},
    cols: { xxs: 4, xs: 4, lg: 4, sm: 4 },
  };

  constructor(props) {
    super(props);

    const layout = this.generateLayout();
    this.state = { layout };
  }

  generateDOM() {
    return _.map(_.range(this.props.items), function(i) {
      return (
        <div key={i}>
          <span className="text">{i}</span>
        </div>
      );
    });
  }

  generateLayout() {
    const p = this.props;
    console.log(p)
    return _.map(new Array(p.items), function(item, i) {
      const y = _.result(p, "y") || Math.ceil(Math.random() * 4) + 1;
      return {
        x: (i * 2) % 12,
        y: Math.floor(i / 6) * y,
        w: 2,
        h: y,
        i: i.toString()
      };
    });
  }

  onLayoutChange(layout) {
    this.props.onLayoutChange(layout);
  }

  render() {
    return (
      <ResponsiveReactGridLayout
        layout={this.state.layout}
        onLayoutChange={() => { console.log('XXXX change! ')}}
        useCSSTransforms={true}
        allowOverlap={true}
        {...this.props}
      >
        {this.generateDOM()}
      </ResponsiveReactGridLayout>
    );
  }
}

if (process.env.STATIC_EXAMPLES === true) {
  import("../test-hook.jsx").then(fn => fn.default(AllowOverlap));
}
