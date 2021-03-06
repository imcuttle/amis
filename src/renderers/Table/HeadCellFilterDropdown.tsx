import React from 'react';
import {Api} from '../../types';
import {RendererProps} from '../../factory';
import {isApiOutdated, isEffectiveApi, normalizeApi} from '../../utils/api';
import {Icon} from '../../components/icons';
import Overlay from '../../components/Overlay';
import PopOver from '../../components/PopOver';
import {findDOMNode} from 'react-dom';
import Checkbox from '../../components/Checkbox';
import xor from 'lodash/xor';

export interface QuickFilterConfig {
  options: Array<any>;
  source: Api;
  multiple: boolean;
  [propName: string]: any;
}

export interface HeadCellFilterProps extends RendererProps {
  data: any;
  name: string;
  filterable: QuickFilterConfig;
  onQuery: (values: object) => void;
}

export class HeadCellFilterDropDown extends React.Component<
  HeadCellFilterProps,
  any
> {
  state = {
    isOpened: false,
    filterOptions: []
  };

  sourceInvalid: boolean = false;
  constructor(props: HeadCellFilterProps) {
    super(props);

    this.open = this.open.bind(this);
    this.close = this.close.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleCheck = this.handleCheck.bind(this);
  }

  componentDidMount() {
    const {filterable} = this.props;

    if (filterable.source) {
      this.fetchOptions();
    } else if (filterable.options.length > 0) {
      this.setState({
        filterOptions: this.alterOptions(filterable.options)
      });
    }
  }

  componentWillReceiveProps(nextProps: HeadCellFilterProps) {
    const props = this.props;

    if (
      props.name !== nextProps.name ||
      props.filterable !== nextProps.filterable ||
      props.data !== nextProps.data
    ) {
      if (nextProps.filterable.source) {
        this.sourceInvalid = isApiOutdated(
          props.filterable.source,
          nextProps.filterable.source,
          props.data,
          nextProps.data
        );
      } else if (nextProps.filterable.options) {
        this.setState({
          filterOptions: this.alterOptions(nextProps.filterable.options || [])
        });
      }
    }
  }

  componentDidUpdate(prevProps: HeadCellFilterProps, prevState: any) {
    const name = this.props.name;

    if (
      this.props.data[name] !== prevProps.data[name] &&
      this.props.filterable.source &&
      prevState.filterOptions !== this.props.filterOptions
    ) {
      this.setState({
        filterOptions: this.alterOptions(this.state.filterOptions)
      });
    }

    this.sourceInvalid && this.fetchOptions();
  }

  fetchOptions() {
    const {env, filterable, data} = this.props;

    if (!isEffectiveApi(filterable.source, data)) {
      return;
    }

    const api = normalizeApi(filterable.source);
    api.cache = 3000; // 开启 3s 缓存，因为固顶位置渲染1次会额外多次请求。

    env.fetcher(api, data).then(ret => {
      let options = (ret.data && ret.data.options) || [];
      this.setState({
        filterOptions: ret && ret.data && this.alterOptions(options)
      });
    });
  }

  alterOptions(options: Array<any>) {
    const {data, filterable, name} = this.props;
    const filterValue =
      data && typeof data[name] !== 'undefined' ? data[name] : '';

    if (filterable.multiple) {
      options = options.map(option => ({
        ...option,
        selected: filterValue.split(',').indexOf(option.value) > -1
      }));
    } else {
      options = options.map(option => ({
        ...option,
        selected: option.value === filterValue
      }));
    }
    return options;
  }

  handleClickOutside() {
    this.close();
  }

  open() {
    this.setState({
      isOpened: true
    });
  }

  close() {
    this.setState({
      isOpened: false
    });
  }

  handleClick(value: string) {
    const {onQuery, name} = this.props;

    onQuery({
      [name]: value
    });
    this.close();
  }

  handleCheck(value: string) {
    const {data, name, onQuery} = this.props;
    let query: string;

    if (data[name] && data[name] === value) {
      query = '';
    } else {
      query =
        (data[name] && xor(data[name].split(','), [value]).join(',')) || value;
    }

    onQuery({
      [name]: query
    });
  }

  handleReset() {
    const {name, onQuery} = this.props;
    onQuery({
      [name]: undefined
    });
    this.close();
  }

  render() {
    const {isOpened, filterOptions} = this.state;
    const {
      data,
      name,
      filterable,
      popOverContainer,
      classPrefix: ns,
      classnames: cx,
      translate: __
    } = this.props;

    return (
      <span
        className={cx(
          `${ns}TableCell-filterBtn`,
          typeof data[name] !== 'undefined' ? 'is-active' : ''
        )}
      >
        <span onClick={this.open}>
          <Icon icon="column-filter" className="icon" />
        </span>
        {isOpened ? (
          <Overlay
            container={popOverContainer || (() => findDOMNode(this))}
            placement="left-bottom-left-top right-bottom-right-top"
            target={
              popOverContainer ? () => findDOMNode(this)!.parentNode : null
            }
            show
          >
            <PopOver
              classPrefix={ns}
              onHide={this.close}
              className={cx(
                `${ns}TableCell-filterPopOver`,
                (filterable as any).className
              )}
              overlay
            >
              {filterOptions && filterOptions.length > 0 ? (
                <ul className={cx('DropDown-menu')}>
                  {!filterable.multiple
                    ? filterOptions.map((option: any, index) => (
                        <li
                          key={index}
                          className={cx('DropDown-divider', {
                            'is-selected': option.selected
                          })}
                          onClick={this.handleClick.bind(this, option.value)}
                        >
                          {option.label}
                        </li>
                      ))
                    : filterOptions.map((option: any, index) => (
                        <li key={index} className={cx('DropDown-divider')}>
                          <Checkbox
                            classPrefix={ns}
                            onChange={this.handleCheck.bind(this, option.value)}
                            checked={option.selected}
                          >
                            {option.label}
                          </Checkbox>
                        </li>
                      ))}
                  <li
                    key="DropDown-menu-reset"
                    className={cx('DropDown-divider')}
                    onClick={this.handleReset.bind(this)}
                  >
                    {__('重置')}
                  </li>
                </ul>
              ) : null}
            </PopOver>
          </Overlay>
        ) : null}
      </span>
    );
  }
}
