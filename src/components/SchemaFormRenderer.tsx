import {
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { InfoCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useState } from 'react';

import type { SchemaField } from '../types/rules';

type SchemaFormRendererProps = {
  schema: SchemaField[];
};

type TagInputFieldProps = {
  value?: string[];
  onChange?: (value: string[]) => void;
  placeholder?: string;
};

function TagInputField({
  value = [],
  onChange,
  placeholder = '输入后回车添加',
}: TagInputFieldProps) {
  const [inputValue, setInputValue] = useState('');

  function triggerChange(nextValue: string[]) {
    onChange?.(nextValue);
  }

  function addTag() {
    const nextTag = inputValue.trim();
    if (!nextTag || value.includes(nextTag)) {
      setInputValue('');
      return;
    }
    triggerChange([...value, nextTag]);
    setInputValue('');
  }

  function removeTag(tag: string) {
    triggerChange(value.filter((item) => item !== tag));
  }

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Space wrap>
        {value.map((tag) => (
          <Tag
            key={tag}
            closable
            onClose={(event) => {
              event.preventDefault();
              removeTag(tag);
            }}
            color="blue"
          >
            {tag}
          </Tag>
        ))}
      </Space>
      <Input
        value={inputValue}
        placeholder={placeholder}
        onChange={(event) => setInputValue(event.target.value)}
        onPressEnter={addTag}
        suffix={<PlusOutlined onClick={addTag} />}
      />
    </Space>
  );
}

function FieldLabel({
  label,
  description,
}: {
  label: string;
  description?: string;
}) {
  return (
    <Space size={6}>
      <span>{label}</span>
      {description ? (
        <Tooltip title={description}>
          <Typography.Text type="secondary">
            <InfoCircleOutlined />
          </Typography.Text>
        </Tooltip>
      ) : null}
    </Space>
  );
}

function renderField(field: SchemaField) {
  if (field.type === 'tag') {
    return <TagInputField placeholder={field.placeholder} />;
  }

  if (field.type === 'number') {
    return (
      <InputNumber
        min={field.min}
        max={field.max}
        placeholder={field.placeholder}
        style={{ width: '100%' }}
      />
    );
  }

  if (field.type === 'switch') {
    return <Switch />;
  }

  if (field.type === 'select') {
    return (
      <Select
        placeholder={field.placeholder}
        options={field.options}
        allowClear={false}
      />
    );
  }

  if (field.type === 'textarea') {
    return <Input.TextArea rows={4} placeholder={field.placeholder} allowClear />;
  }

  return <Input placeholder={field.placeholder} allowClear />;
}

export function SchemaFormRenderer({ schema }: SchemaFormRendererProps) {
  return (
    <>
      {schema.map((field) => (
        <Form.Item
          key={field.field}
          name={field.field}
          label={<FieldLabel label={field.label} description={field.description} />}
          valuePropName={field.type === 'switch' ? 'checked' : 'value'}
          extra={field.description}
        >
          {renderField(field)}
        </Form.Item>
      ))}
    </>
  );
}
