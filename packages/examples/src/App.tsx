import './App.css'
import BasicLayout from './pages/1-basic'
import '../../lib/css/styles.css';
import 'react-resizable/css/styles.css'
import ShowcaseLayout from './pages/0-showcase';
import { ComponentType } from 'react'
import NoDraggingLayout from './pages/2-no-dragging';
import MessyLayout from './pages/3-messy';
import GridPropertyLayout from './pages/4-grid-property';
import StaticElementsLayout from './pages/5-static-elements';
import LocalStorageLayout from './pages/7-localstorage';
import AddRemoveLayout from './pages/6-dynamic-add-remove';
import ResponsiveLocalStorageLayout from './pages/8-localstorage-responsive';
import MinMaxLayout from './pages/9-min-max-wh';
import DynamicMinMaxLayout from './pages/10-dynamic-min-max-wh';
import NoCollisionLayout from './pages/11-prevent-collision';
import ErrorCaseLayout from './pages/12-error-case';
import ToolboxLayout from './pages/13-toolbox';
import DragFromOutsideLayout from './pages/14-drag-from-outside';
import { BoundedLayout } from './pages/15-bounded';
import BootstrapStyleLayout from './pages/17-responsive-bootstrap-style';
import ResizableHandles from './pages/16-resizable-handles';
import ScaledLayout from './pages/18-scale';
import AllowOverlap from './pages/19-allow-overlap';
import PreserveAspectRatio from './pages/20-aspect-ratio';
interface Examle {
	t: string,
	c: ComponentType<any>
}

let array: Examle[] = [
	{
		t: '0-Showcase',
		c: ShowcaseLayout
	},
	{
		t: '1-Basic-layout',
		c: BasicLayout
	},
	{
		t: '2-no-dragging',
		c: NoDraggingLayout
	},
	{
		t: '3-messy',
		c: MessyLayout
	},
	{
		t: '4-grid-property',
		c: GridPropertyLayout
	},
	{
		t: '5-static-elements',
		c: StaticElementsLayout
	},
	{
		t: '6-dynamic-add-remove',
		c: AddRemoveLayout
	},
	{
		t: '7-localstorage',
		c: LocalStorageLayout
	},
	{
		t: '8-localstorage-responsive',
		c: ResponsiveLocalStorageLayout
	},
	{
		t: '9-min-max-wh',
		c: MinMaxLayout
	},
	{
		t: '10-dynamic-min-max-wh',
		c: DynamicMinMaxLayout
	},
	{
		t: '11-prevent-collision',
		c: NoCollisionLayout
	},
	{
		t: '12-error-case',
		c: ErrorCaseLayout
	},
	{
		t: '13-toolbox',
		c: ToolboxLayout
	},
	{
		t: '14-drag-from-outside',
		c: DragFromOutsideLayout
	},
	{
		t: '15-bounded',
		c: BoundedLayout
	},
	{
		t: '16-resizable-handles',
		c: ResizableHandles
	},
	{
		t: '17-responsive-bootstrap-style',
		c: BootstrapStyleLayout
	},
	{
		t: '18-scale',
		c: ScaledLayout
	},
	{
		t: '19-allow-overlap',
		c: AllowOverlap
	},
	{
		t: '20-preserve-aspect-ratio',
		c: PreserveAspectRatio
	}
]

function App() {

	return (
		<div className="App">
			{array.map((x, ix) => {
				return <div key={ix}>
					<h1>{x.t}</h1>
					<x.c />
				</div>
			})}
		</div>
	)
}

export default App
