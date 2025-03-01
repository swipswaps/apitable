/**
 * APITable <https://github.com/apitable/apitable>
 * Copyright (C) 2022 APITable Ltd. <https://apitable.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { FC } from 'react';
import * as React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Form } from 'antd';
import { useRequest } from 'pc/hooks';
import { useSetState } from 'pc/hooks';
import classNames from 'classnames';
import { t, Strings, IReduxState, StoreActions, ConfigConstant, StatusCode } from '@apitable/core';
import { TextInput, Button } from '@apitable/components';
import { Message, PasswordInput, IdentifyingCodeInput, WithTipWrapper } from 'pc/components/common';
import styles from './style.module.less';
import { useUserRequest } from 'pc/hooks';
import { getVerifyData, VerifyTypes, IChangePasswordConfig } from '../utils';

export interface IModifyPasswordProps {
  setActiveItem: React.Dispatch<React.SetStateAction<number>>;
}

const defaultData = {
  identifyingCode: '',
  password: '',
  confirmPassword: ''
};

export const ModifyPassword: FC<IModifyPasswordProps> = props => {
  const { setActiveItem } = props;
  const [data, setData] = useSetState<{
    identifyingCode: string;
    password: string;
    confirmPassword: string;
  }>(defaultData);

  const [errMsg, setErrMsg] = useSetState<{
    accountErrMsg: string;
    identifyingCodeErrMsg: string;
    passwordErrMsg: string;
  }>({
    accountErrMsg: '',
    identifyingCodeErrMsg: '',
    passwordErrMsg: ''
  });

  const dispatch = useDispatch();
  const user = useSelector((state: IReduxState) => state.user.info)!;
  const { modifyPasswordReq } = useUserRequest();
  const { run: modifyPassword, loading } = useRequest(modifyPasswordReq, { manual: true });

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>, property: 'password' | 'confirmPassword') => {
    const value = e.target.value.trim();
    if (errMsg.passwordErrMsg) {
      setErrMsg({ passwordErrMsg: '' });
    }
    if (
      (data.password && property === 'confirmPassword' && data.password !== value)
      || (data.confirmPassword && property === 'password' && data.confirmPassword != value)
    ) {
      setErrMsg({ passwordErrMsg: t(Strings.password_not_identical_err) });
    }

    setData({ [property]: value });
  };

  const handleSubmit = async() => {
    if (!data.identifyingCode.length) {
      setErrMsg({ identifyingCodeErrMsg: t(Strings.message_verification_code_empty) });
      return;
    }

    const type = user.mobile ? ConfigConstant.CodeTypes.SMS_CODE :
      ConfigConstant.CodeTypes.EMAIL_CODE;
    const result = await modifyPassword(data.password, data.identifyingCode, type);

    if (!result) {
      return;
    }

    const { success, code, message } = result;

    if (success) {
      (Strings.message_set_password_succeed || Strings.change_password_success) && Message.success(
        { content: user!.needPwd ? t(Strings.message_set_password_succeed) : t(Strings.change_password_success) }
      );
      setData(defaultData);
      dispatch(StoreActions.updateUserInfo({ needPwd: false }));
      setActiveItem(0);
      return;
    }

    switch (code) {
      case StatusCode.PASSWORD_ERR: {
        setErrMsg({ passwordErrMsg: message });
        break;
      }
      default:
        setErrMsg({ identifyingCodeErrMsg: message });
    }
  };

  const handleIdentifyingCodeChange = React.useCallback((
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (errMsg.identifyingCodeErrMsg) {
      setErrMsg({ identifyingCodeErrMsg: '' });
    }

    const value = e.target.value.trim();
    setData({ identifyingCode: value });
  }, [setErrMsg, errMsg.identifyingCodeErrMsg, setData]);

  const CodeContent = React.useMemo(() => {
    if (!user || !(user?.email || user?.mobile)) return null;

    const { codeMode, label, accountText, smsType, emailType, areaCode, verifyAccount, prefixIcon } =
      getVerifyData({ key: VerifyTypes.CHANGE_PASSWORD }) as IChangePasswordConfig;
    return (
      <>
        <div className={styles.item}>
          <div className={styles.label}>
            {label}:
          </div>
          <TextInput
            prefix={prefixIcon}
            value={accountText}
            disabled
            block
          />
        </div>
        <div className={styles.item}>
          <div className={styles.label}>
            {t(Strings.verification_code)}:
          </div>
          <div className={styles.content}>
            <WithTipWrapper tip={errMsg.identifyingCodeErrMsg} captchaVisible>
              <IdentifyingCodeInput
                data={{ areaCode, account: verifyAccount }}
                smsType={smsType}
                emailType={emailType}
                mode={codeMode}
                onChange={handleIdentifyingCodeChange}
                setErrMsg={setErrMsg}
                error={Boolean(errMsg.identifyingCodeErrMsg)}
                disabled={Boolean(
                  errMsg.accountErrMsg ||
                  errMsg.identifyingCodeErrMsg
                )}
              />
            </WithTipWrapper>
          </div>
        </div>
      </>
    );
  }, [user, setErrMsg, errMsg.identifyingCodeErrMsg, errMsg.accountErrMsg, handleIdentifyingCodeChange]);

  const btnDisabled = !(data.identifyingCode && data.password && data.confirmPassword &&
    !errMsg.accountErrMsg && !errMsg.identifyingCodeErrMsg && !errMsg.passwordErrMsg);

  return (
    <div className={styles.modifyPasswordWrapper}>
      <div className={styles.title}>{user!.needPwd ? t(Strings.set_password) : t(Strings.change_password)}</div>
      <div className={styles.form}>
        <Form
          className={'modifyPassword'}
          autoComplete='off'
        >
          {CodeContent}
          <div className={classNames([styles.item, styles.newPassword])}>
            <div className={styles.label}>
              {t(Strings.input_new_password)}:
            </div>
            <div className={styles.content}>
              <WithTipWrapper tip={errMsg.passwordErrMsg}>
                <PasswordInput
                  value={data.password}
                  onChange={e => { handlePasswordChange(e, 'password'); }}
                  placeholder={t(Strings.password_rules)}
                  autoComplete='new-password'
                  error={Boolean(errMsg.passwordErrMsg)}
                  block
                />
              </WithTipWrapper>
            </div>
          </div>
          <div className={styles.item}>
            <div className={styles.label}>
              {t(Strings.input_confirmation_password)}:
            </div>
            <div className={styles.content}>
              <WithTipWrapper tip={errMsg.passwordErrMsg}>
                <PasswordInput
                  value={data.confirmPassword}
                  onChange={e => { handlePasswordChange(e, 'confirmPassword'); }}
                  placeholder={t(Strings.placeholder_input_new_password_again)}
                  autoComplete='new-password'
                  error={Boolean(errMsg.passwordErrMsg)}
                  block
                />
              </WithTipWrapper>
            </div>
          </div>
          <Button
            color='primary'
            className={styles.saveBtn}
            htmlType='submit'
            size='large'
            disabled={btnDisabled}
            loading={loading}
            onClick={handleSubmit}
            block
          >
            {t(Strings.save)}
          </Button>
        </Form>
      </div>
    </div>
  );
};
