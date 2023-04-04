import React from "react";
import _ from "lodash";
import RGL, { WidthProvider } from "react-grid-layout-next";
import { PropsWithItems } from "./types.js";

const ReactGridLayout = WidthProvider(RGL);

export default class PreserveAspectRatio extends React.PureComponent<PropsWithItems, any> {
	static defaultProps = {
		className: "layout",
		items: 2,
		//rowHeight: 1,
		onLayoutChange: function () { },
		//cols: 300
	};

	constructor(props) {
		super(props);

		const layout = this.generateLayout();
		this.state = { layout };
	}

	generateDOM() {
		return _.map(_.range(this.props.items), function (i) {
			return (
				<div key={i}>
					<span className="text">{i}</span>
				</div>
			);
		});
	}

	generateLayout() {
		const p = this.props;
		return _.map(new Array(p.items), function (item, i) {
			const y = _.result(p, "y") || Math.ceil(Math.random() * 4) + 1;
			return {
				x: (i * 2) % 12,
				y: Math.floor(i / 6) * y,
				w: 2,
				h: y,
				i: i.toString(),
				aspectRatio: 1
			};
		});
	}

	onLayoutChange(layout) {
		this.props.onLayoutChange?.(layout);
	}

	render() {
		return (
			<div style={{ height: '750px' }}>
				<ReactGridLayout
					{...this.props}
					layout={this.state.layout}

					onLayoutChange={this.onLayoutChange.bind(this)}
					useCSSTransforms={true}
				>
					{this.generateDOM()}
				</ReactGridLayout>
			</div >
		);
	}
}
