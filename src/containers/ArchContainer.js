import React, { Component, PropTypes } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Link } from 'react-router';

import { Grid, Row, Col, Button, Modal } from 'react-bootstrap';

import { Grid as SSCGrid, Form } from 'ssc-grid';

import NormalWidget from '../components/NormalWidget';
import AdminEditDialog from '../components/AdminEditDialog';
import AdminAlert from '../components/AdminAlert';

import * as Actions from '../actions/arch';

// Consants for table and form
const ReferDataURL = 'http://10.3.14.239/ficloud/refbase_ctr/queryRefJSON';

class ArchContainer extends Component {
  static PropTypes = {
    //dispatch: PropTypes.func.isRequired
  }

  state = {
  }

  constructor(props) {
    super(props);
  }

  componentWillMount() {
    const { itemsPerPage, startIndex } = this.props;
    this.props.fetchTableBodyData(this.props.params.baseDocId, itemsPerPage, startIndex);
    this.props.fetchTableColumnsModel(this.props.params.baseDocId);
  }

  componentDidMount() {
  }

  componentWillReceiveProps(nextProps) {
    const { itemsPerPage, startIndex } = this.props;
    const nextType = nextProps.params.baseDocId;
    const currentType = this.props.params.baseDocId;
    // 当跳转到其他类型的基础档案时候，重新加载表格数据
    if (nextType !== currentType) {
      this.props.fetchTableBodyData(nextType, itemsPerPage, startIndex);
      this.props.fetchTableColumnsModel(nextType);
    }
  }

  // admin card actions
  handleCreate(event) {
    const { tableData } = this.props;
    const rowData = tableData[0];
    this.props.showCreateDialog(rowData);
  }

  closeEditDialog() {
    this.props.closeEditDialog();
  }

  closeCreateDialog() {
    this.props.hideCreateDialog();
  }

  // create form
  handleCreateFormBlur(label, value) {
    //this.props.updateCreateFormFieldValue(label, value);
  }
  /**
   * formData
   * 如果是refer
   * ```
   * {
   *   pk_org: {
   *     selected: [{
   *       id: '',
   *       code: '',
   *       name: ''
   *     }]
   *   }
   * }
   * ```
   */
  handleCreateFormSubmit(event, formData) {
    const { itemsPerPage, startIndex, fields, params: { baseDocId } } = this.props;
    // this.props.submitCreateForm();
    // this.props.saveTableData(baseDocId, fields, formData);
    // this.props.fetchTableBodyData(baseDocId, itemsPerPage, startIndex);

    // add param : personmobile
    // bug des: 传入手机号为空
    if(formData.person.phone){
      formData.personmobile =  formData.person.phone ;
    }

    this.props.saveTableDataAndFetchTableBodyData(baseDocId, fields, formData, null, startIndex);
    event.preventDefault();
  }
  handleCreateFormReset(event) {
    this.props.hideCreateDialog();
    event.preventDefault();
  }

  // edit form
  handleEditFormBlur(index, fieldModel, value) {
    //this.props.updateEditFormFieldValue(index, fieldModel, value);
  }
  handleEditFormSubmit(event, formData) {
    const { startIndex, fields, editDialog: { rowIdx } } = this.props;
    const { baseDocId } = this.props.params;
    // this.props.submitEditForm();
    // this.props.saveTableData(baseDocId, fields, formData, rowIdx);
    this.props.saveTableDataAndFetchTableBodyData(baseDocId, fields, formData, rowIdx, startIndex);
    event.preventDefault();
  }
  handleEditFormReset(event) {
    this.props.closeEditDialog();
    event.preventDefault();
  }

  handlePageAlertDismiss(){
    this.props.hideAdminAlert();
  }

  handleFormAlertDismiss(){
    this.props.hideAdminAlert();
  }

  /**
   * 用户点击下一页的时候，组件先向后端请求数据，等数据回来之后，再把分页组件
   * 跳转到下一页。这样就能避免用户快速点击的问题了。
   */
  // http://git.yonyou.com/sscplatform/ssc_web/commit/767e39de04b1182d8ba6ad55636e959a04b99d2b#note_3528
  //handlePagination(event, selectedEvent) {
  handlePagination(eventKey) {
    const { itemsPerPage, tableData } = this.props;
    let nextPage = eventKey;
    let startIndex = (nextPage-1) * itemsPerPage;

    this.props.fetchTableBodyDataAndGotoPage(this.props.params.baseDocId, itemsPerPage, startIndex, nextPage);
  }

  getCustomComponent() {
    var containerThis = this;
    return React.createClass({
      handleEdit(event) {
        const { rowIdx, rowObj } = this.props;
        // 将rowData保存到store中
        containerThis.props.showEditDialog(rowIdx, rowObj);
        // 从store中取出editFormData填充到表单上
        containerThis.props.initEditFormData(rowObj);
      },
      handleRemove(event) {
        if (!confirm("是否删除？")) {
          return;
        }
        const { rowIdx, rowObj } = this.props;
        const { startIndex } = containerThis.props;
        const { baseDocId } = containerThis.props.params;
        // containerThis.props.deleteTableData(baseDocId, rowIdx, rowObj);
        // containerThis.props.fetchTableBodyData(baseDocId, containerThis.props.itemsPerPage, startIndex);
        containerThis.props.deleteTableDataAndFetchTableBodyData(baseDocId, rowIdx, rowObj, startIndex);
      },
      render() {
        return (
          <td>
            <span onClick={this.handleEdit}
              className="glyphicon glyphicon-pencil" title="编辑"></span>
            <span onClick={this.handleRemove}
              className="glyphicon glyphicon-trash" title="删除"></span>
          </td>
        );
      }
    });
  }

  getReferConfig(fieldRefCode) {
    return {
      referConditions: {
        refCode: fieldRefCode, // 'dept', 该参照类型的字段指向的档案类型
        refType: 'tree',
        rootName: '部门'
      },
      referDataUrl: ReferDataURL
    };
  }

  /**
   * 根据列模型和表格体数据来构建空表单需要的数据
   * 以参照来举例，需要现从columnsModel中的type来现确认哪个字段是参照，然后从
   * tableData中获取参照的具体信息，一般是：
   * ```json
   * { id: '', code: '', name: '' }
   * ```
   */
  getFormDefaultData(columnsModel, tableData, baseDocId) {
    let formData = {};
    columnsModel.forEach(fieldModel => {
      // 隐藏字段，比如id字段，不用初始化值
      if (fieldModel.hidden === true) {
        return;
      }
      const fieldId = fieldModel.id;
      switch(fieldModel.type) {
        case 'ref':
          formData[fieldId] = {
            id: '',
            code: '',
            name: ''
          };
          break;
        case 'boolean':
          // XXDEBUG-START
          // “启用”字段默认应该是true，后端没有传递这个信息，所以只好在前端写死
          if (fieldId === 'enable') {
            formData[fieldId] = true;
          }
          // XXDEBUG-END
          break;
        default:
          formData[fieldId] = '';
          break;
      }
    });
    return formData;
  }

  /**
   * 往formData上的参照字段添加参照的配置
   */
  initReferConfig(formData, columnsModel, tableData, baseDocId) {
    columnsModel.forEach(fieldModel => {
      const fieldId = fieldModel.id;
      if (fieldModel.type !== 'ref' || !tableData[0]) {
        return;
      }
      // 后端返回的数据可能为null
      if (formData[fieldId] == null) {
        return;
      }
      formData[fieldId].config = { ...this.getReferConfig(fieldModel.refCode) };
    });
    return formData;
  }

  render() {
    const {
      tableData, fields,
      editDialog, editFormData,
      createDialog,
      adminAlert, formAlert,
      params: {
        baseDocId
      },
      itemsPerPage
    } = this.props;

    // 表单字段模型 / 表格列模型
    const cols = fields || [];

    // 点击添加按钮时候，表单应该是空的，这里创建表单需要的空数据
    const formDefaultData = this.getFormDefaultData(cols, tableData, baseDocId);

    // 点击编辑按钮的时候，初始化参照数据
    // if (!_.isEmpty(editFormData)) {
    //   this.initReferConfig(editFormData, cols, tableData, baseDocId);
    // }

    var url = './screenshot_20170224_011.jpg';
    return (
      <div>
        <AdminAlert show={adminAlert.show} bsStyle={adminAlert.bsStyle}
          onDismiss={::this.handlePageAlertDismiss}
        >
          <p>{adminAlert.message}</p>
          { adminAlert.resBody ? <p>为了方便定位到问题，如下提供了详细信息：</p> : null }
          { adminAlert.resBody ? <pre>{adminAlert.resBody}</pre> : null }
        </AdminAlert>
        <Grid>
          <Row className="show-grid">
            <Col md={12}>
              <h3>{}</h3>
              <div className="fuck" style={{ display: 'none' }}>
                <img src={url} />
              </div>
              <div style={{ display: 'inline-block', float: 'right' }}>
                <Button onClick={::this.handleCreate}>新增</Button>
              </div>
            </Col>
          </Row>
          <Row className="show-grid">
            <Col md={12}>
              <NormalWidget />
              <SSCGrid tableData={tableData} columnsModel={cols}
                striped bordered condensed hover
                paging
                itemsPerPage={itemsPerPage}
                totalPage={this.props.totalPage}
                activePage={this.props.activePage}
                onPagination={::this.handlePagination}
                operationColumn={{}}
                operationColumnClass={this.getCustomComponent()}
              />
            </Col>
          </Row>
        </Grid>
        <AdminEditDialog className='edit-form' title='编辑' {...this.props} show={editDialog.show} onHide={::this.closeEditDialog}>
          <AdminAlert show={formAlert.show} bsStyle={formAlert.bsStyle}
            onDismiss={::this.handleFormAlertDismiss}
          >
            <p>{formAlert.message}</p>
            { formAlert.resBody ? <p>为了方便定位到问题，如下提供了详细信息：</p> : null }
            { formAlert.resBody ? <pre>{formAlert.resBody}</pre> : null }
          </AdminAlert>
          <Form
            fieldsModel={cols}
            defaultData={editFormData}
            onBlur={::this.handleEditFormBlur}
            onSubmit={::this.handleEditFormSubmit}
            onReset={::this.handleEditFormReset}
          />
        </AdminEditDialog>
        <AdminEditDialog className='create-form' title='新增' {...this.props} show={createDialog.show} onHide={::this.closeCreateDialog}>
          <p className="server-message" style={{color: 'red'}}>{this.props.serverMessage}</p>
          <Form
            fieldsModel={cols}
            defaultData={formDefaultData}
            onBlur={::this.handleCreateFormBlur}
            onSubmit={::this.handleCreateFormSubmit}
            onReset={::this.handleCreateFormReset}
          />
        </AdminEditDialog>
      </div>
    );
  }
};

const mapStateToProps = (state, ownProps) => {
  return {...state.arch,
    arch: state.arch,
    tableData: state.arch.tableData,
    fields: state.arch.fields,
    totalPage: state.arch.totalPage
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(Actions, dispatch);
}

// The component will subscribe to Redux store updates.
export default connect(mapStateToProps, mapDispatchToProps)(ArchContainer);
